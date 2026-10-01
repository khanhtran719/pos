import { AggregateRoot } from '../aggregate-root';
import { DomainEvent } from '../domain-event';

class ItemCreated extends DomainEvent {
  readonly eventType = 'item.created';
}

class Item extends AggregateRoot<string> {
  constructor(id: string) {
    super(id);
  }

  create(): void {
    this.record(new ItemCreated());
  }
}

describe('AggregateRoot', () => {
  it('returns recorded domain events once', () => {
    const item = new Item('item-1');

    item.create();

    expect(item.pullDomainEvents().map((event) => event.eventType)).toEqual(['item.created']);
    expect(item.pullDomainEvents()).toEqual([]);
  });
});
