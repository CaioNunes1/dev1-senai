/**
 * Fonte do "agora" da aplicação (RN01: vale o instante exato do servidor na operação).
 * Injetável para que os testes fixem o instante das regras de data (RN15, fidelidade).
 */
export abstract class Clock {
  abstract now(): Date;
}

export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
