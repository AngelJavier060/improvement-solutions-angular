import { Pipe, PipeTransform } from '@angular/core';

/**
 * Transforms text to have the first letter uppercase and the rest lowercase.
 * Works on each word if applied to full names.
 * Usage: {{ 'JOHN DOE' | capitalize }} => 'John Doe'
 */
@Pipe({
  name: 'capitalize'
})
export class CapitalizePipe implements PipeTransform {
  transform(value: string | null | undefined, mode: 'word' | 'sentence' = 'word'): string {
    if (!value) return '';
    
    const str = String(value).trim();
    if (!str) return '';

    if (mode === 'sentence') {
      // Only capitalize first letter of the entire string
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    // Default 'word' mode: capitalize first letter of each word
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
