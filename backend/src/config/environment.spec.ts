import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  const validConfig = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    PORT: '3000',
    CORS_ORIGIN: 'http://localhost:5173',
  };

  it('converte as variáveis válidas', () => {
    expect(validateEnvironment(validConfig)).toEqual({
      DATABASE_URL: validConfig.DATABASE_URL,
      PORT: 3000,
      CORS_ORIGIN: ['http://localhost:5173'],
    });
  });

  it('usa a porta 3000 quando PORT não é informada', () => {
    expect(validateEnvironment({ ...validConfig, PORT: undefined }).PORT).toBe(3000);
  });

  it('aceita várias origens separadas por vírgula', () => {
    const environment = validateEnvironment({
      ...validConfig,
      CORS_ORIGIN: 'http://localhost:5173, http://localhost:8080',
    });
    expect(environment.CORS_ORIGIN).toEqual(['http://localhost:5173', 'http://localhost:8080']);
  });

  it.each([
    ['DATABASE_URL ausente', { ...validConfig, DATABASE_URL: undefined }],
    ['CORS_ORIGIN ausente', { ...validConfig, CORS_ORIGIN: undefined }],
    ['CORS_ORIGIN com curinga', { ...validConfig, CORS_ORIGIN: '*' }],
    ['PORT não numérica', { ...validConfig, PORT: 'abc' }],
    ['PORT fora da faixa', { ...validConfig, PORT: '70000' }],
  ])('recusa %s', (_description, config) => {
    expect(() => validateEnvironment(config)).toThrow();
  });
});
