const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { execute, subscribe } = require('graphql');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { createServer } = require('http');
const { useServer } = require('graphql-ws/lib/use/ws');
const { WebSocketServer } = require('ws');
const { PubSub } = require('graphql-subscriptions');

const pubsub = new PubSub();
const TODO_ADDED = 'TODO_ADDED';

let todos = []; // Store todos in-memory for simplicity

const typeDefs = gql`
  type Todo {
    id: ID!
    text: String!
  }
  type Query {
    todos: [Todo]
  }
  type Mutation {
    addTodo(text: String!): Todo
  }
  type Subscription {
    todoAdded: Todo
  }
`;



const resolvers = {
    
  Query: {
    todos: () => todos,
  },
  Mutation: {
    addTodo: (_, { text }) => {
      const newTodo = { id: todos.length + 1, text };
      todos.push(newTodo);
      pubsub.publish(TODO_ADDED, { todoAdded: newTodo });
      return newTodo;
    },
  },

  Subscription: {
    todoAdded: {
      subscribe: () => pubsub.asyncIterator([TODO_ADDED]),
    },
  },


};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();

async function startServer() {
  const apolloServer = new ApolloServer({
    schema,
    context: ({ req, res }) => ({ req, res, pubsub }),
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app });

  const httpServer = createServer(app);
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  useServer({ schema, execute, subscribe }, wsServer);

  const PORT = 4000;
  httpServer.listen(PORT, () => {
    console.log(`Server is now running on http://localhost:${PORT}${apolloServer.graphqlPath}`);
    console.log(`Subscriptions are now running on ws://localhost:${PORT}/graphql`);
  });
}

startServer().catch(error => console.error(error));


