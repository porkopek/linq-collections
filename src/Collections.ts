// -
// Created by Ivan Sanz (@isc30)
// Copyright © 2017 Ivan Sanz Carasa. All rights reserved.
// -

// region IMPORTS
// tslint:disable-next-line:max-line-length
import { RangeEnumerable, OrderedEnumerable, IOrderedEnumerable, UniqueEnumerable, ConcatEnumerable, TransformEnumerable, ConditionalEnumerable, ReverseEnumerable, Enumerable, IEnumerable, ArrayEnumerable, IQueryable } from "./Enumerables";
import { Action, Selector,  Aggregator, Predicate, Indexer, Dynamic } from "./Types";
import { Comparer, createComparer } from "./Comparers";
import { IIterable } from "./Iterators";
// endregion

// region EnumerableCollection
export abstract class EnumerableCollection<TElement>
    implements IQueryable<TElement>
{
    public abstract copy(): IQueryable<TElement>;
    public abstract asEnumerable(): IEnumerable<TElement>;
    public abstract toArray(): TElement[];

    public toList(): IList<TElement>
    {
        return new List<TElement>(this.toArray());
    }

    public toDictionary<TKey extends Indexer, TValue>(
        keySelector: Selector<TElement, TKey>,
        valueSelector: Selector<TElement, TValue>)
        : IDictionary<TKey, TValue>
    {
        return Dictionary.fromArray(this.toArray(), keySelector, valueSelector);
    }

    public reverse(): IEnumerable<TElement>
    {
        return new ReverseEnumerable<TElement>(this.asEnumerable());
    }

    public concat(
        other: TElement[] | IQueryable<TElement>,
        ...others: Array<TElement[] | IQueryable<TElement>>)
        : IEnumerable<TElement>
    {
        return this.asEnumerable().concat(other, ...others);
    }

    public contains(element: TElement): boolean
    {
        return this.any(e => e === element);
    }

    public where(predicate: Predicate<TElement>): IEnumerable<TElement>
    {
        return new ConditionalEnumerable<TElement>(this.asEnumerable(), predicate);
    }

    public select<TSelectorOut>(selector: Selector<TElement, TSelectorOut>): IEnumerable<TSelectorOut>
    {
        return new TransformEnumerable<TElement, TSelectorOut>(this.asEnumerable(), selector);
    }

    public selectMany<TSelectorOut>(
        selector: Selector<TElement, TSelectorOut[] | List<TSelectorOut> | IEnumerable<TSelectorOut>>)
        : IEnumerable<TSelectorOut>
    {
        const selectToEnumerable = (e: TElement) =>
        {
            const ie = selector(e);

            return Array.isArray(ie)
                ? new ArrayEnumerable(ie)
                : ie.asEnumerable();
        };

        return this
            .select(selectToEnumerable).toArray()
            .reduce((p, c) => new ConcatEnumerable(p, c), Enumerable.empty()) as IEnumerable<TSelectorOut>;
    }

    public elementAt(index: number): TElement
    {
        const element = this.elementAtOrDefault(index);

        if (element === undefined)
        {
            throw new Error("Out of bounds");
        }

        return element;
    }

    public except(other: IQueryable<TElement>): IEnumerable<TElement>
    {
        return this.asEnumerable().except(other);
    }

    public first(): TElement;
    public first(predicate: Predicate<TElement>): TElement;
    public first(predicate?: Predicate<TElement>): TElement
    {
        let element: TElement | undefined;

        if (predicate !== undefined)
        {
            element = this.firstOrDefault(predicate);
        }
        else
        {
            element = this.firstOrDefault();
        }

        if (element === undefined)
        {
            throw new Error("Sequence contains no elements");
        }

        return element;
    }

    public last(): TElement;
    public last(predicate: Predicate<TElement>): TElement;
    public last(predicate?: Predicate<TElement>): TElement
    {
        let element: TElement | undefined;

        if (predicate !== undefined)
        {
            element = this.lastOrDefault(predicate);
        }
        else
        {
            element = this.lastOrDefault();
        }

        if (element === undefined)
        {
            throw new Error("Sequence contains no elements");
        }

        return element;
    }

    public single(): TElement;
    public single(predicate: Predicate<TElement>): TElement;
    public single(predicate?: Predicate<TElement>): TElement
    {
        let element: TElement | undefined;

        if (predicate !== undefined)
        {
            element = this.singleOrDefault(predicate);
        }
        else
        {
            element = this.singleOrDefault();
        }

        if (element === undefined)
        {
            throw new Error("Sequence contains no elements");
        }

        return element;
    }

    public singleOrDefault(): TElement | undefined;
    public singleOrDefault(predicate: Predicate<TElement>): TElement | undefined;
    public singleOrDefault(predicate?: Predicate<TElement>): TElement | undefined
    {
        if (predicate !== undefined)
        {
            return this.asEnumerable().singleOrDefault(predicate);
        }

        return this.asEnumerable().singleOrDefault();
    }

    public distinct(): IEnumerable<TElement>;
    public distinct<TKey>(keySelector: Selector<TElement, TKey>): IEnumerable<TElement>;
    public distinct<TKey>(keySelector?: Selector<TElement, TKey>): IEnumerable<TElement>
    {
        return new UniqueEnumerable(this.asEnumerable(), keySelector);
    }

    public min(): TElement;
    public min<TSelectorOut>(selector: Selector<TElement, TSelectorOut>): TSelectorOut;
    public min<TSelectorOut>(selector?: Selector<TElement, TSelectorOut>): TElement | TSelectorOut
    {
        if (selector !== undefined)
        {
            // Don't copy iterators
            return new TransformEnumerable<TElement, TSelectorOut>(this.asEnumerable(), selector).min();
        }

        return this.aggregate((previous, current) =>
            (previous !== undefined && previous < current)
                ? previous
                : current);
    }

    public orderBy<TKey>(
        keySelector: Selector<TElement, TKey>): IOrderedEnumerable<TElement>;
    public orderBy<TKey>(
        keySelector: Selector<TElement, TKey>,
        comparer: Comparer<TKey>): IOrderedEnumerable<TElement>;
    public orderBy<TKey>(
        keySelector: Selector<TElement, TKey>,
        comparer?: Comparer<TKey>): IOrderedEnumerable<TElement>
    {
        return new OrderedEnumerable(this.asEnumerable(), createComparer(keySelector, true, comparer));
    }

    public orderByDescending<TKey>(
        keySelector: Selector<TElement, TKey>): IOrderedEnumerable<TElement>
    {
        return new OrderedEnumerable(this.asEnumerable(), createComparer(keySelector, false, undefined));
    }

    public max(): TElement;
    public max<TSelectorOut>(selector: Selector<TElement, TSelectorOut>): TSelectorOut;
    public max<TSelectorOut>(selector?: Selector<TElement, TSelectorOut>): TElement | TSelectorOut
    {
        if (selector !== undefined)
        {
            // Don't copy iterators
            return new TransformEnumerable<TElement, TSelectorOut>(this.asEnumerable(), selector).max();
        }

        return this.aggregate((previous, current) =>
            (previous !== undefined && previous > current)
                ? previous
                : current);
    }

    public sum(selector: Selector<TElement, number>): number
    {
        return this.aggregate(
            (previous: number, current: TElement) => previous + selector(current), 0);
    }

    public skip(amount: number): IEnumerable<TElement>
    {
        return new RangeEnumerable<TElement>(this.asEnumerable(), amount, undefined);
    }

    public take(amount: number): IEnumerable<TElement>
    {
        return new RangeEnumerable<TElement>(this.asEnumerable(), undefined, amount);
    }

    public union(other: IQueryable<TElement>): IEnumerable<TElement>
    {
        return new UniqueEnumerable(this.concat(other));
    }

    public aggregate(aggregator: Aggregator<TElement, TElement | undefined>): TElement;
    public aggregate<TValue>(aggregator: Aggregator<TElement, TValue>, initialValue: TValue): TValue;
    public aggregate<TValue>(
        aggregator: Aggregator<TElement, TValue | TElement | undefined>,
        initialValue?: TValue): TValue | TElement
    {
        if (initialValue !== undefined)
        {
            return this.asEnumerable().aggregate(
                aggregator as Aggregator<TElement, TValue>,
                initialValue);
        }

        return this.asEnumerable().aggregate(
            aggregator as Aggregator<TElement,
            TElement>);
    }

    public any(): boolean;
    public any(predicate: Predicate<TElement>): boolean;
    public any(predicate?: Predicate<TElement>): boolean
    {
        if (predicate !== undefined)
        {
            return this.asEnumerable().any(predicate);
        }

        return this.asEnumerable().any();
    }

    public all(predicate: Predicate<TElement>): boolean
    {
        return this.asEnumerable().all(predicate);
    }

    public average(selector: Selector<TElement, number>): number
    {
        return this.asEnumerable().average(selector);
    }

    public count(): number;
    public count(predicate: Predicate<TElement>): number;
    public count(predicate?: Predicate<TElement>): number
    {
        if (predicate !== undefined)
        {
            return this.asEnumerable().count(predicate);
        }

        return this.asEnumerable().count();
    }

    public elementAtOrDefault(index: number): TElement | undefined
    {
        return this.asEnumerable().elementAtOrDefault(index);
    }

    public firstOrDefault(): TElement | undefined;
    public firstOrDefault(predicate: Predicate<TElement>): TElement | undefined;
    public firstOrDefault(predicate?: Predicate<TElement>): TElement | undefined
    {
        if (predicate !== undefined)
        {
            return this.asEnumerable().firstOrDefault(predicate);
        }

        return this.asEnumerable().firstOrDefault();
    }

    public lastOrDefault(): TElement | undefined;
    public lastOrDefault(predicate: Predicate<TElement>): TElement | undefined;
    public lastOrDefault(predicate?: Predicate<TElement>): TElement | undefined
    {
        if (predicate !== undefined)
        {
            return this.asEnumerable().lastOrDefault(predicate);
        }

        return this.asEnumerable().lastOrDefault();
    }

    public forEach(action: Action<TElement>): void
    {
        return this.asEnumerable().forEach(action);
    }
}
// endregion
// region ArrayQueryable
export abstract class ArrayQueryable<TElement>
    extends EnumerableCollection<TElement>
{
    protected source: TElement[];

    public abstract copy(): IQueryable<TElement>;

    public constructor();
    public constructor(elements: TElement[])
    public constructor(elements: TElement[] = [])
    {
        super();
        this.source = elements;
    }

    public asArray(): TElement[]
    {
        return this.source;
    }

    public toArray(): TElement[]
    {
        return ([] as TElement[]).concat(this.source);
    }

    public toList(): IList<TElement>
    {
        return new List<TElement>(this.toArray());
    }

    public toDictionary<TKey extends Indexer, TValue>(
        keySelector: Selector<TElement, TKey>,
        valueSelector: Selector<TElement, TValue>)
        : IDictionary<TKey, TValue>
    {
        return Dictionary.fromArray(this.toArray(), keySelector, valueSelector);
    }

    public asEnumerable(): IEnumerable<TElement>
    {
        return new ArrayEnumerable(this.source);
    }

    public aggregate(aggregator: Aggregator<TElement, TElement | undefined>): TElement;
    public aggregate<TValue>(aggregator: Aggregator<TElement, TValue>, initialValue: TValue): TValue;
    public aggregate<TValue>(
        aggregator: Aggregator<TElement, TValue | TElement | undefined>,
        initialValue?: TValue): TValue | TElement
    {
        if (initialValue !== undefined)
        {
            return this.source.reduce(
                aggregator as Aggregator<TElement, TValue>,
                initialValue);
        }

        return this.source.reduce(aggregator as Aggregator<TElement, TElement>);
    }

    public any(): boolean;
    public any(predicate: Predicate<TElement>): boolean;
    public any(predicate?: Predicate<TElement>): boolean
    {
        if (predicate !== undefined)
        {
            return this.source.some(predicate);
        }

        return this.source.length > 0;
    }

    public all(predicate: Predicate<TElement>): boolean
    {
        return this.source.every(predicate);
    }

    public average(selector: Selector<TElement, number>): number
    {
        if (this.count() === 0)
        {
            throw new Error("Sequence contains no elements");
        }

        let sum = 0;

        for (let i = 0, end = this.source.length; i < end; ++i)
        {
            sum += selector(this.source[i]);
        }

        return sum / this.source.length;
    }

    public count(): number;
    public count(predicate: Predicate<TElement>): number;
    public count(predicate?: Predicate<TElement>): number
    {
        if (predicate !== undefined)
        {
            return this.source.filter(predicate).length;
        }

        return this.source.length;
    }

    public elementAtOrDefault(index: number): TElement | undefined
    {
        if (index < 0)
        {
            throw new Error("Negative index is forbiden");
        }

        return this.source[index];
    }

    public firstOrDefault(): TElement | undefined;
    public firstOrDefault(predicate: Predicate<TElement>): TElement | undefined;
    public firstOrDefault(predicate?: Predicate<TElement>): TElement | undefined
    {
        if (predicate !== undefined)
        {
            return this.source.filter(predicate)[0];
        }

        return this.source[0];
    }

    public lastOrDefault(): TElement | undefined;
    public lastOrDefault(predicate: Predicate<TElement>): TElement | undefined;
    public lastOrDefault(predicate?: Predicate<TElement>): TElement | undefined
    {
        if (predicate !== undefined)
        {
            const records = this.source.filter(predicate);

            return records[records.length - 1];
        }

        return this.source[this.source.length - 1];
    }

    public forEach(action: Action<TElement>): void
    {
        for (let i = 0, end = this.source.length; i < end; ++i)
        {
            action(this.source[i], i);
        }
    }
}
// endregion
// region List
export interface IList<TElement>
    extends IQueryable<TElement>
{
    copy(): IList<TElement>;

    asArray(): TElement[];
    clear(): void;
    get(index: number): TElement | undefined;
    push(element: TElement): number;
    pushRange(elements: TElement[] | IQueryable<TElement>): number;
    pushFront(element: TElement): number;
    pop(): TElement | undefined;
    popFront(): TElement | undefined;
    remove(element: TElement): void;
    removeAt(index: number): TElement | undefined;
    set(index: number, element: TElement): void;
    indexOf(element: TElement): number;
    insert(index: number, element: TElement): void;
}

export class List<TElement>
    extends ArrayQueryable<TElement>
    implements IList<TElement>
{
    public copy(): IList<TElement>
    {
        return new List<TElement>(this.toArray());
    }

    public clear(): void
    {
        this.source = [];
    }

    public remove(element: TElement): void
    {
        const newSource: TElement[] = [];

        for (let i = 0, end = this.source.length; i < end; ++i)
        {
            if (this.source[i] !== element)
            {
                newSource.push(this.source[i]);
            }
        }

        this.source = newSource;
    }

    public removeAt(index: number): TElement | undefined
    {
        if (index < 0 || this.source[index] === undefined)
        {
            throw new Error("Out of bounds");
        }

        return this.source.splice(index, 1)[0];
    }

    public get(index: number): TElement | undefined
    {
        return this.source[index];
    }

    public push(element: TElement): number
    {
        return this.source.push(element);
    }

    public pushRange(elements: TElement[] | IQueryable<TElement>): number
    {
        if (!Array.isArray(elements))
        {
            elements = elements.toArray();
        }

        return this.source.push.apply(this.source, elements);
    }

    public pushFront(element: TElement): number
    {
        return this.source.unshift(element);
    }

    public pop(): TElement | undefined
    {
        return this.source.pop();
    }

    public popFront(): TElement | undefined
    {
        return this.source.shift();
    }

    public set(index: number, element: TElement): void
    {
        if (index < 0)
        {
            throw new Error("Out of bounds");
        }

        this.source[index] = element;
    }

    public insert(index: number, element: TElement): void
    {
        if (index < 0 || index > this.source.length)
        {
            throw new Error("Out of bounds");
        }

        this.source.splice(index, 0, element);
    }

    public indexOf(element: TElement): number
    {
        return this.source.indexOf(element);
    }
}
// endregion
// region Stack
export interface IStack<TElement>
    extends IQueryable<TElement>
{
    copy(): IStack<TElement>;

    asArray(): TElement[];
    clear(): void;
    peek(): TElement | undefined;
    pop(): TElement | undefined;
    push(element: TElement): number;
}

export class Stack<TElement>
    extends ArrayQueryable<TElement>
    implements IStack<TElement>
{
    public copy(): IStack<TElement>
    {
        return new Stack<TElement>(this.toArray());
    }

    public clear(): void
    {
        this.source = [];
    }

    public peek(): TElement | undefined
    {
        return this.source[this.source.length - 1];
    }

    public pop(): TElement | undefined
    {
        return this.source.pop();
    }

    public push(element: TElement): number
    {
        return this.source.push(element);
    }
}
// endregion
// region Dictionary
export interface IKeyValuePair<TKey extends Indexer, TValue>
{
    key: TKey;
    value: TValue;
}

export interface IDictionary<TKey extends Indexer, TValue>
    extends IQueryable<IKeyValuePair<string, TValue>>
{
    copy(): IDictionary<TKey, TValue>;

    clear(): void;
    containsKey(key: TKey): boolean;
    containsValue(value: TValue): boolean;
    remove(key: TKey): void;
    get(key: TKey): TValue | undefined;
    set(key: TKey, value: TValue): void;
    setOrUpdate(key: TKey, value: TValue): void;
}

export class Dictionary<TKey extends Indexer, TValue>
    extends EnumerableCollection<IKeyValuePair<string, TValue>>
    implements IDictionary<TKey, TValue>
{
    public static fromArray<TArray, TKey extends Indexer, TValue>(
        array: TArray[],
        keySelector: Selector<TArray, TKey>,
        valueSelector: Selector<TArray, TValue>)
        : IDictionary<TKey, TValue>
    {
        const keyValuePairs = array.map<IKeyValuePair<TKey, TValue>>(v =>
        {
            return {
                key: keySelector(v),
                value: valueSelector(v),
            };
        });

        return new Dictionary(keyValuePairs);
    }

    protected dictionary: Dynamic;

    public constructor();
    public constructor(keyValuePairs: Array<IKeyValuePair<TKey, TValue>>);
    public constructor(keyValuePairs?: Array<IKeyValuePair<TKey, TValue>>)
    {
        super();
        this.clear();

        if (keyValuePairs !== undefined)
        {
            for (let i = 0; i < keyValuePairs.length; ++i)
            {
                const pair = keyValuePairs[i];
                this.set(pair.key, pair.value);
            }
        }
    }

    public copy(): IDictionary<TKey, TValue>
    {
        return new Dictionary<TKey, TValue>(this.toArray() as Array<IKeyValuePair<TKey, TValue>>);
    }

    public asEnumerable(): IEnumerable<IKeyValuePair<string, TValue>>
    {
        return new ArrayEnumerable(this.toArray());
    }

    public toArray(): Array<IKeyValuePair<string, TValue>>
    {
        return (Object.getOwnPropertyNames(this.dictionary))
            .map<IKeyValuePair<string, TValue>>(p =>
            {
                return {
                    key: p,
                    value: this.dictionary[p],
                };
            });
    }

    public clear(): void
    {
        this.dictionary = {};
    }

    public containsKey(key: TKey): boolean
    {
        return this.dictionary.hasOwnProperty(key);
    }

    public containsValue(value: TValue): boolean
    {
        return this.dictionary.indexOf(value) !== -1;
    }

    public remove(key: TKey): void
    {
        if (this.containsKey(key))
        {
            delete this.dictionary[key];
        }
    }

    public get(key: TKey): TValue | undefined
    {
        return this.dictionary[key];
    }

    public set(key: TKey, value: TValue): void
    {
        if (this.containsKey(key))
        {
            throw new Error(`Key already exists: ${key}`);
        }

        this.setOrUpdate(key, value);
    }

    public setOrUpdate(key: TKey, value: TValue): void
    {
        this.dictionary[key] = value;
    }
}
// endregion
