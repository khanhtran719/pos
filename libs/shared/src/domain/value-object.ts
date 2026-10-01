export abstract class ValueObject<TProps extends object> {
  protected constructor(protected readonly props: TProps) {}

  equals(other: ValueObject<TProps> | undefined): boolean {
    if (!other) {
      return false;
    }

    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
