export abstract class Entity<TId> {
  protected constructor(private readonly id: TId) {}

  getId(): TId {
    return this.id;
  }

  equals(other: Entity<TId> | undefined): boolean {
    if (!other) {
      return false;
    }

    return Object.is(this.id, other.id);
  }
}
