import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { QueueModule } from "../queue";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
