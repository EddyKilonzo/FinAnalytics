import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../src/app.module";
// supertest is CJS; use require so Jest/ts-jest don't break default export interop
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
import { AllExceptionsFilter } from "../src/common/filters/http-exception.filter";
import { PrismaService } from "../src/common/prisma.service";

describe("Health (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix("api/v1", {
      exclude: ["api/docs", "api/docs/(.*)"],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.$disconnect();
    await app.close();
  });

  it("GET /api/v1/health returns 200 and status shape", () => {
    return request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200)
      .expect((res: { body: Record<string, unknown> }) => {
        expect(res.body).toHaveProperty("success", true);
        expect(res.body).toHaveProperty("data");
        expect(res.body.data).toMatchObject({
          status: expect.stringMatching(/^(ok|degraded)$/),
          timestamp: expect.any(String),
          database: { connected: expect.any(Boolean) },
          ml: { available: expect.any(Boolean) },
        });
      });
  });
});
