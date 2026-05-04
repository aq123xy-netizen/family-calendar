import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [taskName, setTaskName] = useState('');
  const [category, setCategory] = useState('Bills');
  const [tasks, setTasks] = useState([]);

  function handleAddTask() {
    if (taskName.trim() === '') return;

    const newTask = {
      id: Date.now(),
      name: taskName,
      category: category,
    };

    setTasks([...tasks, newTask]);
    setTaskName('');
    setCategory('Bills');
  }

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">Family Calendar</h1>

      <div className="card p-4 mb-4">
        <h3 className="text-center mb-3">Add Task</h3>

        <input
          type="text"
          className="form-control mb-3"
          placeholder="Task name"
          value={taskName}
          onChange={(event) => setTaskName(event.target.value)}
        />

        <select
          className="form-select mb-3"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option>Bills</option>
          <option>Cleaning</option>
          <option>Family</option>
          <option>Appointment</option>
          <option>Other</option>
        </select>

        <button className="btn btn-primary" onClick={handleAddTask}>
          Add Task
        </button>
      </div>

      <div className="card p-4">
        <h3>Task List</h3>

        {tasks.length === 0 ? (
          <p className="text-muted">No tasks yet.</p>
        ) : (
          <ul className="list-group">
            {tasks.map((task) => (
              <li key={task.id} className="list-group-item">
                <strong>{task.name}</strong> — {task.category}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;

