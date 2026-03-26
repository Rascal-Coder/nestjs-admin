import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { HealthDataDto } from "@/common/dto/health-data.dto";
import { Public } from "@/common/decorators/public.decorator";
import { ApiOkResponseWrapped } from "@/common/swagger/api-ok-wrapped.decorator";

@ApiTags("health")
@Controller()
export class AppController {
  @Public()
  @Get("health")
  @ApiOkResponseWrapped(HealthDataDto)
  health() {
    return { status: "ok" };
  }
}
