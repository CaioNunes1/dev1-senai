import { Clock } from '../src/common/clock/clock';
import { parseBrasiliaDateTime } from '../src/common/domain/datetime';

/** Relógio dos testes: começa num instante fixo e avança só quando o teste manda. */
export class TestClock extends Clock {
  private current = new Date('2026-11-02T13:15:00.000Z');

  now(): Date {
    return new Date(this.current);
  }

  /** Define o instante no formato da RN01 (ex.: `2026-11-05T16:40-03:00`). */
  setBrasilia(text: string): void {
    const instant = parseBrasiliaDateTime(text);
    if (!instant) {
      throw new Error(`Data de teste inválida: ${text}`);
    }
    this.current = instant;
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}
