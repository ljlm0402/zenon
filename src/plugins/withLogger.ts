import type { SetFunction, GetFunction, ActionName } from "../createStore";

function pickValuesOnly<T extends Record<string, any>>(obj: T) {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (typeof obj[key] !== "function" && typeof obj[key] !== "symbol") {
      result[key] = obj[key];
    }
  }
  return result;
}

function getTimeStamp() {
  return new Date().toLocaleTimeString();
}

export function withLogger<T extends Record<string, any>>(
  options: {
    store?: string;
    timestamp?: boolean;
    expanded?: boolean;
  } = {}
) {
  return (initializer: (set: SetFunction<T>, get: GetFunction<T>) => T) =>
    (set: SetFunction<T>, get: GetFunction<T>): T => {
      const loggerSet: SetFunction<T> = (updater, actionName) => {
        const prevState = pickValuesOnly({ ...get() });
        set(updater, actionName);
        const nextState = pickValuesOnly(get());
        const action = {
          type: actionName,
          args: updater ? [updater] : [],
          ...(options.store && { store: options.store }),
        };
        const title = `action 🦉 ${options.store ? `[${options.store}]` : ""} ${
          action.type
        } ${options.timestamp ? `@${getTimeStamp()}` : ""}`;
        console[options.expanded ? "group" : "groupCollapsed"](
          `%c${title}`,
          "font-weight: bold; color: #42b883;"
        );
        console.log(
          "%cprev state",
          "font-weight: bold; color: grey;",
          prevState
        );
        console.log("%caction", "font-weight: bold; color: #69B7FF;", action);
        console.log(
          "%cnext state",
          "font-weight: bold; color: #4caf50;",
          nextState
        );
        console.groupEnd();
      };

      return initializer(loggerSet, get);
    };
}
