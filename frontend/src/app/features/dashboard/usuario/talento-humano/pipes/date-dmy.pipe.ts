import { Pipe, PipeTransform } from '@angular/core';
import { formatDateDmy } from '../utils/date-dmy';

/** Muestra fechas ISO (yyyy-MM-dd) como dd/MM/yyyy. */
@Pipe({ name: 'dateDmy' })
export class DateDmyPipe implements PipeTransform {
  transform(value?: string | null): string {
    return formatDateDmy(value) || '-';
  }
}
