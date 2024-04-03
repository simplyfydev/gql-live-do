const {  gql } = require('apollo-server-express');


module.exports.todoTypeDefs = gql`
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

