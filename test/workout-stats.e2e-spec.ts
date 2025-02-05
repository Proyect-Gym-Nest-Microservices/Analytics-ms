import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { WorkoutStatisticsModule } from '../src/workout-statistics/workout-statistics.module';
import { PrismaClient } from '@prisma/client';
import { firstValueFrom, of } from 'rxjs';
import { NATS_SERVICE } from '../src/config/services.config';
import { Period } from '../src/common/enums/analytics.enum';
import { TargetType } from '../src/common/enums/target-type.enum';
import { envs } from '../src/config/envs.config';

class MockClientProxy {
  private handlers = new Map<string, Function>();

  public send(pattern: string, data: any) {
    const handler = this.handlers.get(pattern);
    if (handler) {
      try {
        const result = handler(data);
        return of(result);
      } catch (error) {
        throw error;
      }
    }
    throw new Error(`No handler for pattern: ${pattern}`);
  }

  public setHandler(pattern: string, handler: Function) {
    this.handlers.set(pattern, handler);
  }
}

describe('WorkoutStatisticsController (e2e)', () => {
  let app: INestApplication;
  let mockClientProxy: MockClientProxy;
  let prisma: PrismaClient;

  beforeAll(async () => {
    mockClientProxy = new MockClientProxy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        WorkoutStatisticsModule
      ],
    })
      .overrideProvider(NATS_SERVICE)
      .useValue(mockClientProxy)
      .compile();

      app = moduleFixture.createNestApplication();
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: envs.DATABASE_URL_TEST
          }
        }
      });

    await app.init();
  });

  beforeEach(async () => {
    try {
      // Limpiar la base de datos
      await prisma.workoutGenderStats.deleteMany();
      await prisma.workoutCategoryStats.deleteMany();
      await prisma.workoutDifficultyStats.deleteMany();
      await prisma.workoutStatistics.deleteMany();

      // Configurar handlers por defecto
      setupDefaultMockHandlers();
    } catch (error) {
      console.error('Database cleanup failed:', error);
      throw error;
    }
  });

  const setupDefaultMockHandlers = () => {
    // Mock para find.one.workout
    mockClientProxy.setHandler('find.one.workout', ({ id }) => ({
      id,
      totalRatings: 100,
      level: 'INTERMEDIATE',
      category: 'STRENGTH',
      score: 4.5
    }));

    // Mock para calculate.gender.stats.by.target
    mockClientProxy.setHandler('calculate.gender.stats.by.target', 
      ({ targetId, targetType }: { targetId: number, targetType: TargetType }) => ([
        { gender: 'MALE', count: 60 },
        { gender: 'FEMALE', count: 40 }
      ])
    );
  };

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Generate Workout Statistics', () => {
    it('should create new workout statistics when none exist', async () => {
      const date = new Date();
      const workoutId = 1;

      const result = await firstValueFrom(
        mockClientProxy.send('generate.workout.statistics', {
          workoutId,
          period: Period.DAILY,
          date: date.toISOString()
        })
      );

      expect(result).toBeDefined();
      expect(result.workoutId).toBe(workoutId);
      expect(result.period).toBe(Period.DAILY);
      expect(result.totalUses).toBe(100);
      expect(result.popularityScore).toBe(4.5);
      expect(result.genderStats).toHaveLength(2);
      expect(result.categoryStats).toHaveLength(1);
      expect(result.difficultyStats).toHaveLength(1);
    });

    it('should update existing workout statistics', async () => {
      const date = new Date();
      const workoutId = 1;

      // Crear estadísticas iniciales
      const initial = await firstValueFrom(
        mockClientProxy.send('generate.workout.statistics', {
          workoutId,
          period: Period.DAILY,
          date: date.toISOString()
        })
      );

      // Actualizar el mock de workout con nuevos valores
      mockClientProxy.setHandler('find.one.workout', ({ id }) => ({
        id,
        totalRatings: 150,
        level: 'INTERMEDIATE',
        category: 'STRENGTH',
        score: 4.8
      }));

      // Generar estadísticas nuevamente
      const updated = await firstValueFrom(
        mockClientProxy.send('generate.workout.statistics', {
          workoutId,
          period: Period.DAILY,
          date: date.toISOString()
        })
      );

      expect(updated.id).toBe(initial.id);
      expect(updated.totalUses).toBe(150);
      expect(updated.popularityScore).toBe(4.8);
    });
  });

  describe('Get Workout Statistics', () => {
    it('should get workout statistics for a specific period', async () => {
      const date = new Date();
      const workoutId = 1;

      // Crear algunas estadísticas de prueba
      await prisma.workoutStatistics.create({
        data: {
          workoutId,
          period: Period.DAILY,
          date,
          totalUses: 100,
          popularityScore: 4.5,
          genderStats: {
            createMany: {
              data: [
                { gender: 'MALE', useCount: 60 },
                { gender: 'FEMALE', useCount: 40 }
              ]
            }
          },
          categoryStats: {
            createMany: {
              data: [{ category: 'STRENGTH', useCount: 100 }]
            }
          },
          difficultyStats: {
            createMany: {
              data: [{ difficulty: 'INTERMEDIATE', useCount: 100 }]
            }
          }
        }
      });

      const result = await firstValueFrom(
        mockClientProxy.send('get.workout.statistics', {
          period: Period.DAILY,
          date: date.toISOString()
        })
      );

      expect(result).toBeDefined();
      expect(result.popularWorkouts).toHaveLength(1);
      expect(result.topRated).toHaveLength(1);
      expect(result.categoryStats).toBeDefined();
      expect(result.difficultyStats).toBeDefined();
    });

    it('should handle period with no data', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      try {
        await firstValueFrom(
          mockClientProxy.send('get.workout.statistics', {
            period: Period.DAILY,
            date: futureDate.toISOString()
          })
        );
        fail('Should throw not found error');
      } catch (error) {
        expect(error.status).toBe(404);
        expect(error.message).toContain('No data found');
      }
    });
  });

  describe('Find All Workout Statistics', () => {
    it('should return paginated workout statistics', async () => {
      // Crear múltiples estadísticas
      const statsToCreate = Array.from({ length: 15 }, (_, i) => ({
        workoutId: i + 1,
        period: Period.DAILY,
        date: new Date(),
        totalUses: 100 + i,
        popularityScore: 4.5
      }));

      await prisma.workoutStatistics.createMany({
        data: statsToCreate
      });

      const result = await firstValueFrom(
        mockClientProxy.send('find.all.workout.stats', { 
          page: 1, 
          limit: 10 
        })
      );

      expect(result.data).toHaveLength(10);
      expect(result.meta.totalStats).toBe(15);
      expect(result.meta.lastPage).toBe(2);
    });
  });

  describe('Find and Delete Workout Statistics', () => {
    it('should find statistics by ID', async () => {
      const stats = await prisma.workoutStatistics.create({
        data: {
          workoutId: 1,
          period: Period.DAILY,
          date: new Date(),
          totalUses: 100,
          popularityScore: 4.5,
          genderStats: {
            createMany: {
              data: [{ gender: 'MALE', useCount: 60 }]
            }
          }
        },
        include: {
          genderStats: true
        }
      });

      const result = await firstValueFrom(
        mockClientProxy.send('find.workout.statistic.by.id', { 
          id: stats.id 
        })
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(stats.id);
      expect(result.genderStats).toHaveLength(1);
    });

    it('should delete statistics and related data', async () => {
      const stats = await prisma.workoutStatistics.create({
        data: {
          workoutId: 1,
          period: Period.DAILY,
          date: new Date(),
          totalUses: 100,
          popularityScore: 4.5,
          genderStats: {
            createMany: {
              data: [{ gender: 'MALE', useCount: 60 }]
            }
          },
          categoryStats: {
            createMany: {
              data: [{ category: 'STRENGTH', useCount: 100 }]
            }
          },
          difficultyStats: {
            createMany: {
              data: [{ difficulty: 'INTERMEDIATE', useCount: 100 }]
            }
          }
        }
      });

      const result = await firstValueFrom(
        mockClientProxy.send('delete.workout.statistic.by.id', { 
          id: stats.id 
        })
      );

      expect(result.message).toBe('Statistics deleted successfully');

      // Verificar que se eliminaron todos los datos relacionados
      const deletedStats = await prisma.workoutStatistics.findUnique({
        where: { id: stats.id },
        include: {
          genderStats: true,
          categoryStats: true,
          difficultyStats: true
        }
      });

      expect(deletedStats).toBeNull();
    });
  });
});