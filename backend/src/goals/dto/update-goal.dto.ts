import { PartialType } from "@nestjs/swagger";
import { CreateGoalDto } from "./create-goal.dto";

/** All CreateGoalDto fields become optional for partial updates. */
export class UpdateGoalDto extends PartialType(CreateGoalDto) {}
