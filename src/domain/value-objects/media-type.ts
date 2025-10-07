export type MediaTypeValue = 'photo' | 'video' | 'document';

export class MediaType {
  private constructor(private readonly value: MediaTypeValue) {}

  static readonly PHOTO = new MediaType('photo');
  static readonly VIDEO = new MediaType('video');
  static readonly DOCUMENT = new MediaType('document');

  static from(raw: string): MediaType {
    const normalized = raw.trim().toLowerCase();

    if (normalized === MediaType.PHOTO.value) {
      return MediaType.PHOTO;
    }

    if (normalized === MediaType.VIDEO.value) {
      return MediaType.VIDEO;
    }

    if (normalized === MediaType.DOCUMENT.value) {
      return MediaType.DOCUMENT;
    }

    throw new Error(`Invalid media type: ${raw}`);
  }

  equals(other: MediaType): boolean {
    return this.value === other.value;
  }

  toString(): MediaTypeValue {
    return this.value;
  }

  valueOf(): MediaTypeValue {
    return this.value;
  }
}
