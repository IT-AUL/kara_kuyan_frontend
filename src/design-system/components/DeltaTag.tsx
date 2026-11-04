import { Tag } from './Tag';

type DeltaTagProps = {
  value: number;
  suffix?: string;
};

export function DeltaTag({ value, suffix = '%' }: DeltaTagProps) {
  if (value === 0) {
    return <Tag label={`0${suffix}`} tone="neutral" />;
  }
  if (value > 0) {
    return <Tag label={`↑ +${value}${suffix}`} tone="ok" />;
  }
  return <Tag label={`↓ ${value}${suffix}`} tone="bad" />;
}
