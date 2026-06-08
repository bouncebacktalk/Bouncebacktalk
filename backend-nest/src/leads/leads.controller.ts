import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  BulkDeleteLeadsDto,
  BulkUpdateLeadStatusDto,
  CreateLeadDto,
  LeadIdParamDto,
  ListLeadsQueryDto,
  UpdateLeadDto,
} from "./dto/lead.dto";
import { LeadsService } from "./leads.service";

@Controller("leads")
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CreateLeadDto) {
    return this.leads.createPublic(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  list(@Query() query: ListLeadsQueryDto) {
    return this.leads.list(query);
  }

  // Bulk routes are declared before `:id` so the literal paths win the match.
  @Post("bulk-status")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  bulkStatus(@Body() body: BulkUpdateLeadStatusDto) {
    return this.leads.bulkUpdateStatus(body.ids, body.status);
  }

  @Post("bulk-delete")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  bulkDelete(@Body() body: BulkDeleteLeadsDto) {
    return this.leads.bulkDelete(body.ids);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  getOne(@Param() params: LeadIdParamDto) {
    return this.leads.getOne(params.id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  update(@Param() params: LeadIdParamDto, @Body() body: UpdateLeadDto) {
    return this.leads.update(params.id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, AdminGuard)
  delete(@Param() params: LeadIdParamDto) {
    return this.leads.delete(params.id);
  }
}
