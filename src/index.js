import express from "express";
import cors from "cors";

import { v4 as uuid4 } from "uuid";

const app = express();

app.use(cors());
app.use(express.json());

const users = {};

const createObject = (payload) => ({ ...payload, id: uuid4() });
const parseTodos = (todos) =>
  Object.entries(todos).map(([id, todo]) => ({ id, ...todo }));
const parseUser = ({ todos, ...user }) => ({
  todos: parseTodos(todos),
  ...user,
});

const VerifyUserMiddleware = (request, response, next) => {
  const { username } = request.headers;
  const user = users[username];
  if (!user) return response.status(404).json({ error: "User not found" });
  request.user = { ...user, username };
  return next();
};

const VerifyTodoMiddleware = (request, response, next) => {
  const {
    user: { todos },
    params: { id },
  } = request;
  const todo = todos[id];
  if (!todo) return response.status(404).json({ error: "User not found" });
  request.todo = { ...todo, id };
  request.todoObj = todo;
  return next();
};

app.post("/users", (request, response) => {
  const { name, username } = request.body;
  if (users[username])
    return response.status(400).json({
      error: "User already exists",
    });
  const user = createObject({ name, todos: {} });
  users[username] = user;

  return response.json(parseUser({ ...user, username }));
});

app.get("/todos", VerifyUserMiddleware, (request, response) =>
  response.json(parseTodos(request.user.todos))
);

app.post("/todos", VerifyUserMiddleware, (request, response) => {
  const {
    user,
    body: { title, deadline },
  } = request;
  const { id, ...todo } = createObject({
    title,
    deadline,
    done: false,
    created_at: new Date(),
  });
  user.todos[id] = todo;
  return response.status(201).json({ id, ...todo });
});

app.put(
  "/todos/:id",
  VerifyUserMiddleware,
  VerifyTodoMiddleware,
  (request, response) => {
    const {
      body: { title, deadline },
      todoObj,
      todo: { id },
    } = request;
    todoObj.title = title;
    todoObj.deadline = deadline;
    return response.json({ ...todoObj, id });
  }
);

app.patch(
  "/todos/:id/done",
  VerifyUserMiddleware,
  VerifyTodoMiddleware,
  (request, response) => {
    const {
      todoObj,
      todo: { id },
    } = request;
    todoObj.done = true;
    return response.json({ ...todoObj, id });
  }
);

app.delete(
  "/todos/:id",
  VerifyUserMiddleware,
  VerifyTodoMiddleware,
  (request, response) => {
    delete request.user.todos[request.todo.id];
    return response.sendStatus(204);
  }
);

export default app;
