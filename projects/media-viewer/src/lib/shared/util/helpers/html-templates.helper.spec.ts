import { HtmlTemplatesHelper } from './html-templates.helper';

describe('HtmlTemplatesHelper', () => {

  it('should describe the hint when validation is unavailable', () => {
    const actual = HtmlTemplatesHelper.setDescribedBy(undefined, { hint: 'hint', id: 'id' });

    expect(actual).toBe('id-hint');
  });

  it('should describe both hint and error when invalid', () => {
    const config = { hint: 'hint', id: 'id' };
    const actual = HtmlTemplatesHelper.setDescribedBy({ isInvalid: true }, config);

    expect(actual).toBe('id-hint id-error');
  });

  it('should describe only the error when invalid without a hint', () => {
    const config = { id: 'id' };
    const actual = HtmlTemplatesHelper.setDescribedBy({ isInvalid: true }, config);

    expect(actual).toBe('id-error');
  });

  it('should describe only the hint when valid', () => {
    const config = { hint: 'hint', id: 'id' };
    const actual = HtmlTemplatesHelper.setDescribedBy({ isInvalid: false }, config);

    expect(actual).toBe('id-hint');
  });

  it('should omit describedBy when valid without a hint', () => {
    const config = { id: 'id' };
    const actual = HtmlTemplatesHelper.setDescribedBy({ isInvalid: false }, config);

    expect(actual).toBeNull();
  });
});
