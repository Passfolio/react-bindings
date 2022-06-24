import type { InferBindingGetType } from '../../binding/types/inference';
import type { ReadonlyBinding } from '../../binding/types/readonly-binding';
import { useBinding } from '../../binding/use-binding';
import { isBinding } from '../../binding-utils/type-utils';
import { getStatsHandler } from '../../config/stats-handler';
import { useCallbackRef } from '../../internal-hooks/use-callback-ref';
import { getTypedKeys } from '../../internal-utils/get-typed-keys';
import { LimiterOptions } from '../../limiter/options';
import type { SingleOrArray } from '../../types/array-like';
import type { EmptyObject } from '../../types/empty';
import { useBindingEffect } from '../../use-binding-effect/use-binding-effect';
import type { DerivedBindingOptions } from './options';

const defaultNamedBindingValues: Readonly<EmptyObject> = Object.freeze({});

/** Extracts the value types from bindings */
type ExtractNamedBindingsValues<NamedBindingsT extends Record<string, ReadonlyBinding | undefined>> = {
  [KeyT in keyof NamedBindingsT]: NamedBindingsT[KeyT] extends ReadonlyBinding
    ? InferBindingGetType<NamedBindingsT[KeyT]>
    : NamedBindingsT[KeyT] extends ReadonlyBinding | undefined
    ? InferBindingGetType<NamedBindingsT[KeyT]> | undefined
    : NamedBindingsT[KeyT];
};

/** A derived binding is a binding derived from zero or more other bindings */
export function useDerivedBinding<GetT, NamedBindingsT extends Record<string, ReadonlyBinding | undefined> = Record<string, never>>(
  bindings: SingleOrArray<ReadonlyBinding | undefined> | NamedBindingsT,
  transformer: (bindingValues: ExtractNamedBindingsValues<NamedBindingsT>) => GetT,
  {
    id,
    deps,
    areInputValuesEqual,
    detectInputChanges = true,
    makeComparableInputValue,
    areOutputValuesEqual,
    detectOutputChanges = true,
    limitMode,
    limitMSec,
    limitType,
    priority,
    queue
  }: DerivedBindingOptions<GetT>
): ReadonlyBinding<GetT> {
  const limiterProps: LimiterOptions = { limitMode, limitMSec, limitType, priority, queue };

  const isNonNamedBindings = Array.isArray(bindings) || isBinding(bindings);
  const namedBindings = isNonNamedBindings ? undefined : bindings;
  const namedBindingsKeys = namedBindings !== undefined ? getTypedKeys(namedBindings) : undefined;

  const getNamedBindingValues = () => {
    if (namedBindingsKeys === undefined || namedBindings === undefined) {
      return defaultNamedBindingValues as ExtractNamedBindingsValues<NamedBindingsT>;
    }

    const namedBindingValues: Partial<ExtractNamedBindingsValues<NamedBindingsT>> = {};
    for (const key of namedBindingsKeys) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      namedBindingValues[key] = namedBindings[key]?.get();
    }

    return namedBindingValues as ExtractNamedBindingsValues<NamedBindingsT>;
  };

  const measuredTransformer = useCallbackRef((namedBindingValues: ExtractNamedBindingsValues<NamedBindingsT> = getNamedBindingValues()) => {
    const startMSec = performance.now();
    try {
      return transformer(namedBindingValues);
    } finally {
      getStatsHandler().trackDerivedBindingTransformerDidRun?.({ id, durationMSec: performance.now() - startMSec });
    }
  });

  const internalBinding = useBinding(() => measuredTransformer(), {
    id,
    areEqual: areOutputValuesEqual,
    detectChanges: detectOutputChanges
  });

  useBindingEffect(bindings, (namedBindingValues) => internalBinding.set(measuredTransformer(namedBindingValues)), {
    deps,
    areInputValuesEqual,
    detectInputChanges,
    makeComparableInputValue,
    ...limiterProps
  });

  return internalBinding;
}