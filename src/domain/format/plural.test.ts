import { pluralRu, studentsText } from './plural';

describe('pluralRu', () => {
  it('picks the right form', () => {
    expect([0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111].map((n) => pluralRu(n, 'ученик', 'ученика', 'учеников'))).toEqual([
      'учеников', 'ученик', 'ученика', 'ученика', 'учеников', 'учеников', 'учеников', 'учеников', 'ученик', 'ученика', 'учеников', 'ученик', 'учеников',
    ]);
    expect(studentsText(3)).toBe('3 ученика');
  });
});
