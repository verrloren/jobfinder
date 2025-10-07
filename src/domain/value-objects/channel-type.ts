export type ChannelTypeValue = 'public' | 'private';

export class ChannelType {
  private constructor(private readonly value: ChannelTypeValue) {}

  static readonly PUBLIC = new ChannelType('public');
  static readonly PRIVATE = new ChannelType('private');

  static from(raw: string): ChannelType {
    const normalized = raw.trim().toLowerCase();

    if (normalized === ChannelType.PUBLIC.value) {
      return ChannelType.PUBLIC;
    }

    if (normalized === ChannelType.PRIVATE.value) {
      return ChannelType.PRIVATE;
    }

    throw new Error(`Invalid channel type: ${raw}`);
  }

  equals(other: ChannelType): boolean {
    return this.value === other.value;
  }

  toString(): ChannelTypeValue {
    return this.value;
  }

  valueOf(): ChannelTypeValue {
    return this.value;
  }
}
