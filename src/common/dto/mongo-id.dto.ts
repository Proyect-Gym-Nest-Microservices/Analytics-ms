import { IsMongoId, IsString } from "class-validator";


export class MongoIdDto{
    @IsMongoId()
    @IsString()
    id:string
}