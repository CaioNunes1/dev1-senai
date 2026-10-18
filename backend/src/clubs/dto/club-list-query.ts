import { Injectable, PipeTransform } from '@nestjs/common';
import { parseEnumParam, RawQuery } from '../../common/validation/query-params';
import { CLUB_SORT_OPTIONS, ClubSortOption } from '../domain/club-ordering';

/** `GET /clubs?sort=`: um só valor entre `name`, `net_worth_asc` e `net_worth_desc`; padrão `name`. */
@Injectable()
export class ClubSortQueryPipe implements PipeTransform<RawQuery, ClubSortOption> {
  transform(query: RawQuery): ClubSortOption {
    return parseEnumParam(query, 'sort', CLUB_SORT_OPTIONS) ?? 'name';
  }
}
