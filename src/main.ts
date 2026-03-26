import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import boxen from "boxen";
import chalk from "chalk";
import { AppModule } from "./app.module";
import { JWT_BEARER_SWAGGER_SCHEME } from "./common/constants/jwt-auth";

/** 使用 chalk + boxen 输出启动信息，便于区分 API 与 Swagger 地址 */
function printStartupBanner(
  port: number,
  apiPrefix: string,
  showSwagger: boolean,
): void {
  const apiUrl = `http://127.0.0.1:${port}/${apiPrefix}`;
  const lines = [
    chalk.green.bold("✔ 应用已启动"),
    "",
    chalk.gray("API     ") + chalk.cyanBright.underline(apiUrl),
  ];
  if (showSwagger) {
    lines.push(
      chalk.gray("Swagger ") +
        chalk.magentaBright.underline(`http://127.0.0.1:${port}/docs`),
    );
  }

  console.log(
    boxen(lines.join("\n"), {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      margin: { top: 1, bottom: 0, left: 0, right: 0 },
      borderStyle: "round",
      borderColor: "green",
      title: chalk.bold.white(" nestjs-admin "),
      titleAlignment: "center",
    }),
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const prefix = process.env.API_PREFIX ?? "api";
  const nodeEnv = process.env.NODE_ENV ?? "development";
  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({
    origin: true,
    credentials: true,
  });

  if (nodeEnv !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("NestJS Admin API")
      .setDescription("管理后台 API（JWT · Casbin · Prisma）")
      .setVersion("1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "HTTP Bearer JWT。请求头：`Authorization: Bearer <accessToken>`（登录接口返回的 accessToken）",
        },
        JWT_BEARER_SWAGGER_SCHEME,
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = parseInt(process.env.PORT ?? "8000", 10);
  await app.listen(port);
  printStartupBanner(port, prefix, nodeEnv !== "production");
}

void bootstrap();
