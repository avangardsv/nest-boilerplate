import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { PrismaKnownErrorFilter } from "./prisma/filters/prisma-known-error.filter";

async function bootstrap() {
	const logger = new Logger("bootstrap");

	const app = await NestFactory.create(AppModule);
	const config = new DocumentBuilder()
		.setTitle("Boilerplate")
		.setDescription("CRUD app with auth")
		.setVersion("1.0")
		.addBearerAuth({
			type: "http",
			scheme: "bearer",
			bearerFormat: "JWT",
			name: "JWT",
			description: "Enter access tokens",
			in: "header",
		})
		.build();
	const document = SwaggerModule.createDocument(app, config);

	SwaggerModule.setup("api", app, document, {
		swaggerOptions: {
			persistAuthorization: true,
		},
	});
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			forbidUnknownValues: true,
			forbidNonWhitelisted: true,
		}),
	);

	app.useGlobalFilters(new PrismaKnownErrorFilter());
	await app.listen(3000);
	logger.log("App runs localhost http://localhost:3000");
	logger.log("Swagger runs localhost http://localhost:3000/api");
}
bootstrap();
