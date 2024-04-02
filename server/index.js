// server.js

const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');
const { PubSub } = require("graphql-subscriptions")
const http = require('http')

const { useServer } = require('graphql-ws/lib/use/ws');
const { WebSocketServer } = require('ws');






// Connect to MongoDB
const URL = 'mongodb+srv://dhananjay372001:kVQzFriX8RV856ob@cluster0.giv6mdz.mongodb.net/liveDoData'

mongoose.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});




const pubsub = new PubSub();

// Define MongoDB schema
const todoSchema = new mongoose.Schema({
    text: String,
    completed: Boolean
});
const Todo = mongoose.model('Todo', todoSchema);

// GraphQL type definitions
const typeDefs = gql`
  type Todo {
    id: ID!
    text: String!
    completed: Boolean!
  }

  type Query {
    todos: [Todo]
  }

  type Mutation {
    addTodo(text: String!): Todo
    toggleTodoCompleted(id: ID!): Todo
  }

  type Subscription {
    todoAdded: Todo
    todoToggled: Todo
  }
`;

// Resolvers
const resolvers = {
    Query: {
        todos: () => Todo.find().exec()
    },
    Mutation: {
        addTodo: async (_, { text }) => {
            const todo = new Todo({ text, completed: false });
            await todo.save();
            pubsub.publish('TODO_ADDED', { todoAdded: todo });
            return todo;
        },

        toggleTodoCompleted: async (_, { id }) => {
            const todo = await Todo.findById(id);
            todo.completed = !todo.completed;
            await todo.save();
            pubsub.publish('TODO_TOGGLED', { todoToggled: todo });
            return todo;
        }
    },
    Subscription: {
        todoAdded: {
            subscribe: () => pubsub.asyncIterator(['TODO_ADDED'])
        },
        todoToggled: {
            subscribe: () => pubsub.asyncIterator(['TODO_TOGGLED'])
        }
    }
};


const app = express();
const PORT = process.env.PORT || 4000;


const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req, res }) => ({ req, res, pubsub })
});


server.start().then(res => {
    server.applyMiddleware({ app });

    const httpServer = http.createServer(app);
    // Set up WebSocket server
    const wsServer = new WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });

    useServer({ schema: server.schema }, wsServer);

    httpServer.listen(PORT, () => {
        console.log(`Server ready at http://localhost:${PORT}${server.graphqlPath}`);
        console.log(`Subscriptions ready at ws://localhost:${PORT}/graphql`);
    });
});

