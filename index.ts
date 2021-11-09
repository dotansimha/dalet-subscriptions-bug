import { eachValueFrom } from "rxjs-for-await";
import { makeExecutableSchema } from "./node_modules/@graphql-tools/schema";
import { finalize, interval, tap } from "rxjs";
import { ExecutionResult, parse, subscribe } from "graphql";

const test$ = interval(1000).pipe(
  tap((x) => {
    console.log(`RxJS interval emitted value ${x}`);
    return `Value #${x}`;
  }),
  finalize(() => {
    console.log(`RxJS Subscription finalize called!`);
  })
);

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Subscription {
      test: String
    }

    type Query {
      dummy: String
    }
  `,
  resolvers: {
    Subscription: {
      test: {
        subscribe: () => {
          console.log(
            `  -> subscription "Subscription.test" started ("subscribe" was called)`
          );

          return eachValueFrom(test$);
        },
        resolve: (x) => x,
      },
    },
    Query: {
      dummy: () => "dummy",
    },
  },
});

async function main() {
  console.log(`Executing GraphQL Subscription`);

  const gqlSubscription = (await subscribe({
    schema,
    document: parse(/* GraphQL */ `
      subscription test {
        test
      }
    `),
    variableValues: {},
    contextValue: {},
    operationName: "test",
  })) as AsyncIterableIterator<ExecutionResult>;

  console.log(`GraphQL Subscription ready, running for await on result...`);

  for await (const value of gqlSubscription) {
    console.log(`GraphQL Subscription got response:`, value);

    if (value.data!.test.includes("3")) {
      console.log(
        `Found value 3 in response, stopping listener for GraphQL operation`
      );

      break;
    }
  }
}

main();
