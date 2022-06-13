/* istanbul ignore file */

import React, { ComponentType, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';

import { sleep } from './sleep';

type OnMountHandler = (rootElement: HTMLElement) => void | Promise<void>;
type OnUnmountHandler = () => void | Promise<void>;

interface Props {
  onMount: (handler: OnMountHandler) => void;
  onUnmount: (handler: OnUnmountHandler) => void;
}

export const runInDom = async <T = ReactNode | void,>(useFunc: (props: Props) => T) =>
  act(async () => {
    const div = document.createElement('div');

    const onMountHandlers: OnMountHandler[] = [];
    let registerOnMount: ((handler: OnMountHandler) => void) | undefined = (handler: OnMountHandler) => {
      onMountHandlers.push(handler);
    };

    const onUnmountHandlers: OnUnmountHandler[] = [];
    let registerOnUnmount: ((handler: OnUnmountHandler) => void) | undefined = (handler: OnUnmountHandler) => {
      onUnmountHandlers.push(handler);
    };

    const Component = ((props: Props) => useFunc(props) ?? null) as ComponentType<Props>;

    ReactDOM.render(<Component onMount={registerOnMount} onUnmount={registerOnUnmount} />, div);
    registerOnMount = undefined;
    registerOnUnmount = undefined;

    // Need sleep otherwise mount will never get triggered
    await sleep(0);

    for (const onMountHandler of onMountHandlers) {
      await onMountHandler(div);
    }
    onMountHandlers.length = 0;

    expect(ReactDOM.unmountComponentAtNode(div)).toBe(true);

    for (const onUnmountHandler of onUnmountHandlers) {
      await onUnmountHandler();
    }
    onUnmountHandlers.length = 0;
  });
