import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/http/all-exceptions.filter';
import { API_DOCS_PATH, API_PREFIX } from './common/http/api.constants';
import { PlainObjectBodyPipe } from './common/http/plain-object-body.pipe';
import { StrictValidationPipe } from './common/validation/strict-validation.pipe';
import { Environment } from './config/environment';

/**
 * Configuração transversal da API, compartilhada pelo `main.ts` e pelos testes e2e
 * para que os testes exercitem exatamente o mesmo pipeline da aplicação real.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<Environment, true>);

  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });
  app.useGlobalPipes(new PlainObjectBodyPipe(), new StrictValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  setUpApiDocs(app);
}

function setUpApiDocs(app: INestApplication): void {
  const document = new DocumentBuilder()
    .setTitle('Passe — API do mercado de jogadores')
    .setDescription('API REST do Estudo de Caso SENAI/PE – CÓD. 237 Desenvolvedor I (Fullstack).')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup(API_DOCS_PATH, app, () => SwaggerModule.createDocument(app, document));
}
