import {Either, Left, Right} from 'purify-ts'

export type Result<T, E> = Either<E, T>

/**
 * Sequences an array of Result values into a single Result containing an array.
 *
 * This is an applicative combinator that collects all successful values into an array.
 * If any Result in the array is a Left (error), it immediately returns the first error.
 * If all Results are Right (success), it returns Right containing an array of all values.
 *
 * @template T - The success value type
 * @template E - The error type
 * @param {Result<T, E>[]} results - Array of Result values to sequence
 * @returns {Result<T[], E>} - Result containing an array of success values, or the first error
 *
 * @example
 * ```typescript
 * const results = [Right(1), Right(2), Right(3)]
 * resultSequence(results) // Right([1, 2, 3])
 *
 * const withError = [Right(1), Left('error'), Right(3)]
 * resultSequence(withError) // Left('error')
 * ```
 */
export function resultSequence<T, E>(results: Result<T, E>[]): Result<T[], E> {
    const acc: T[] = []
    for (const r of results) {
        const result = r.caseOf({
            Right: (value) => {
                acc.push(value)
                return null as Result<T[], E> | null
            },
            Left: (error) => r as Result<any, E>
        })
        if (result !== null) {
            // Early return first error
            return result
        }
    }
    return Right(acc)
}

export function resultAp4<T, T1, T2, T3, T4, E>(result1: Result<T1, E>, result2: Result<T2, E>, result3: Result<T3, E>, result4: Result<T4, E>,
                                                ctor: (t1: T1, t2: T2, t3: T3, t4: T4) => T,
                                                errcat: (es: E[]) => E): Result<T, E> {
    if (result1.isRight() && result2.isRight() && result3.isRight() && result4.isRight()) {
        return Right(ctor(result1.unsafeCoerce(), result2.unsafeCoerce(), result3.unsafeCoerce(), result4.unsafeCoerce()))
    }
    const results = [result1, result2, result3, result4]
        .filter(e => e.isLeft())
        .map(e => e.extract())
    return Left(errcat(results))
}

export function resultAp8<T, T1, T2, T3, T4, T5, T6, T7, T8, E>(result1: Result<T1, E>, result2: Result<T2, E>, result3: Result<T3, E>, result4: Result<T4, E>,
                                                                result5: Result<T5, E>, result6: Result<T6, E>, result7: Result<T7, E>, result8: Result<T8, E>,
                                                                ctor: (t1: T1, t2: T2, t3: T3, t4: T4, t5: T5, t6: T6, t7: T7, t8: T8) => T,
                                                                errcat: (es: E[]) => E): Result<T, E> {
    if (result1.isRight() && result2.isRight() && result3.isRight() && result4.isRight() &&
        result5.isRight() && result6.isRight() && result7.isRight() && result8.isRight()) {
        return Right(ctor(result1.unsafeCoerce(), result2.unsafeCoerce(), result3.unsafeCoerce(), result4.unsafeCoerce(),
            result5.unsafeCoerce(), result6.unsafeCoerce(), result7.unsafeCoerce(), result8.unsafeCoerce()))
    }
    const results = [result1, result2, result3, result4, result5, result6, result7, result8]
        .filter(e => e.isLeft())
        .map(e => e.extract())
    return Left(errcat(results))
}

// AsyncResult = Promise<Result<T,E>>
export type AsyncResult<T, E> = Promise<Result<T, E>>

export const AsyncResult = {
    map<T, U, E>(f: (t: T) => U, ar: AsyncResult<T, E>): AsyncResult<U, E> {
        return ar.then((r) => r.map(f))
    },
    mapError<T, E, F>(f: (e: E) => F, ar: AsyncResult<T, E>): AsyncResult<T, F> {
        return ar.then((r) => r.mapLeft(f))
    },
    retn<T, E = never>(t: T): AsyncResult<T, E> {
        return Promise.resolve(Right(t))
    },
    ofResult<T, E>(r: Result<T, E>): AsyncResult<T, E> {
        return Promise.resolve(r)
    }
}

export type TResult<T, E> = Result<T, E>

/**
 * Creates a Left case handler for caseOf that throws an error with the error value.
 * Useful in tests where you expect a Result to be Right but want to fail gracefully if it's Left.
 */
export function throwOnLeft<E>(error: E): never {
    throw new Error(`Expected success but got error: ${JSON.stringify(error)}`)
}


