import { describe, expect, it } from 'vitest';
import { addressCandidates, cleanAddress } from './address.js';

describe('cleanAddress', () => {
  it.each([
    ['MANTENOCOLDSTORAGE 1260SYCAMORERD MANTENO IL60950', 'MANTENOCOLDSTORAGE 1260 SYCAMORE RD MANTENO IL 60950'],
    ['1260SYCAMORERD MANTENOIL60950', '1260 SYCAMORE RD MANTENO IL 60950'],
    ['500MAINST DALLAS TX75201-1234', '500 MAIN ST DALLAS TX 75201-1234'],
    ['2242BUSHYPARKAVE, GOOSE CREEK, SC 29445', '2242 BUSHYPARK AVE GOOSE CREEK SC 29445'],
    ['12THST ATLANTA GA30301', '12TH ST ATLANTA GA 30301'],
    ['3RDAVE NEW YORK NY10001', '3RD AVE NEW YORK NY 10001'],
    ['100BROADWAY NEW YORK NY10005', '100 BROADWAY NEW YORK NY 10005'],
    ['100FOREST DALLAS TX', '100 FOREST DALLAS TX'],
  ])('%s', (input, expected) => {
    expect(cleanAddress(input)).toBe(expected);
  });

  it('leaves normal addresses alone', () => {
    expect(cleanAddress('Dallas, TX')).toBe('Dallas TX');
    expect(cleanAddress('1260 W Sycamore Rd, Manteno, IL 60950')).toBe('1260 W Sycamore Rd Manteno IL 60950');
    expect(cleanAddress('12A Main St')).toBe('12A Main St');
  });

  it('does not split a word that only ends in a state code', () => {
    expect(cleanAddress('Dallas TX 75201')).toBe('Dallas TX 75201');
    expect(cleanAddress('AB12345')).toBe('AB 12345');
    expect(cleanAddress('XX12345')).toBe('XX12345');
  });
});

describe('addressCandidates', () => {
  it('tries the street address without the company name first', () => {
    expect(addressCandidates('MANTENOCOLDSTORAGE 1260SYCAMORERD MANTENO IL60950')).toEqual([
      '1260 SYCAMORE RD MANTENO IL 60950',
      'MANTENOCOLDSTORAGE 1260 SYCAMORE RD MANTENO IL 60950',
      'MANTENOCOLDSTORAGE 1260SYCAMORERD MANTENO IL60950',
    ]);
  });

  it('keeps a plain address as one candidate', () => {
    expect(addressCandidates('1260 Sycamore Rd Manteno IL 60950')).toEqual(['1260 Sycamore Rd Manteno IL 60950']);
  });

  it('does not mistake highway, suite or ZIP numbers for a house number', () => {
    expect(addressCandidates('TRUCK STOP HWY 50 DALLAS TX')[0]).toBe('TRUCK STOP HWY 50 DALLAS TX');
    expect(addressCandidates('WAREHOUSE SUITE 5 DALLAS TX')[0]).toBe('WAREHOUSE SUITE 5 DALLAS TX');
    expect(addressCandidates('DALLAS TX 75201')[0]).toBe('DALLAS TX 75201');
  });

  it('is empty for empty input', () => {
    expect(addressCandidates('   ')).toEqual([]);
  });
});
