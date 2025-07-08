import { Injectable } from '@nestjs/common';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

@Injectable()
export class DateFormatterHandlebarsHelperService {
  private readonly MAX_FORMAT_LENGTH = 100;
  private readonly ALLOWED_FORMAT_CHARS = /^[YyMmDdHhSsaAEepdT\s\-\/:.,'"]+$/;

  private validateFormatString(formatString: string): boolean {
    if (!formatString) return true;

    // Check length to prevent memory exhaustion
    if (formatString.length > this.MAX_FORMAT_LENGTH) {
      return false;
    }

    // Check for suspicious characters (basic allowlist)
    if (!this.ALLOWED_FORMAT_CHARS.test(formatString)) {
      return false;
    }

    return true;
  }

  private validateDateInput(date: any): Date | null {
    if (!date) return null;

    let dateObj: Date;

    try {
      if (typeof date === 'string') {
        // Limit string length to prevent DoS
        if (date.length > 50) return null;
        dateObj = parseISO(date);
      } else if (typeof date === 'number') {
        // Validate timestamp range (reasonable bounds)
        if (date < 0 || date > 8640000000000000) return null; // JavaScript date limits
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return null;
      }

      return isValid(dateObj) ? dateObj : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Factory method that returns currentDate helper function
   */
  getCurrentDateHelper() {
    return (...args: any[]): string => {
      const [formatString] = args.slice(0, -1);

      const now = new Date();

      if (!formatString) {
        return now.toISOString();
      }

      if (!this.validateFormatString(formatString)) {
        throw new Error(`Invalid format string blocked: ${formatString}`);
      }

      // Common presets
      const presets: Record<string, string> = {
        iso: 'yyyy-MM-dd',
        short: 'M/d/yyyy',
        long: 'EEEE, MMMM d, yyyy',
        time: 'h:mm a',
        datetime: 'M/d/yyyy h:mm a',
        timestamp: 'T',
      };

      const pattern = presets[formatString.toLowerCase()] || formatString;

      if (pattern === 'T') {
        return now.getTime().toString();
      }

      try {
        return format(now, pattern);
      } catch (error) {
        throw new Error(`Error Formatting Date: "${pattern}"`);
      }
    };
  }

  /**
   * Factory method that returns formatDate helper function
   */
  getFormatDateHelper() {
    return (...args: any[]): string => {
      const [date, formatString] = args.slice(0, -1);

      const dateObj = this.validateDateInput(date);
      if (!dateObj) {
        return 'Invalid Date';
      }

      if (!formatString) {
        return dateObj.toISOString();
      }

      if (!this.validateFormatString(formatString)) {
        throw new Error(`Invalid format string blocked: ${formatString}`);
      }

      try {
        return format(dateObj, formatString);
      } catch (error) {
        throw new Error(`Error Formatting Date "${formatString}"`);
      }
    };
  }

  /**
   * Factory method that returns timeAgo helper function
   */
  getTimeAgoHelper() {
    return (...args: any[]): string => {
      const [date] = args.slice(0, -1);

      const dateObj = this.validateDateInput(date);
      if (!dateObj) {
        throw new Error(`Invalid Date`);
      }

      try {
        return formatDistanceToNow(dateObj, { addSuffix: true });
      } catch (error) {
        throw new Error(`Invalid Date`);
      }
    };
  }
}
