

const { PubSub } = require('graphql-subscriptions');


const pubsub = new PubSub();
const TODO_ADDED = 'TODO_ADDED';

let todos = []; // Store todos in-memory for simplicity


module.exports.todoResolvers = {

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
