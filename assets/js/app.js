$(function () {
  var storageKey = "family-calendar-tasks";

  function loadTasks() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || [];
    } catch (error) {
      return [];
    }
  }

  function saveTasks(tasks) {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
  }

  function removeTask(id) {
    var tasks = loadTasks().filter(function (task) {
      return task.id !== id;
    });

    saveTasks(tasks);
    renderTasks();
  }

  function renderTasks() {
    var tasks = loadTasks();
    var $list = $("#task-list");
    var $empty = $("#task-empty");

    $list.empty();

    if (!tasks.length) {
      $list.addClass("d-none");
      $empty.removeClass("d-none");
      return;
    }

    $empty.addClass("d-none");
    $list.removeClass("d-none");

    tasks.forEach(function (task) {
      var $item = $("<li>").addClass("list-group-item px-0 py-3 bg-transparent");
      var $row = $("<div>").addClass("d-flex justify-content-between align-items-start gap-3");
      var $text = $("<div>");
      var $title = $("<div>").addClass("fw-semibold fs-5").text(task.name);
      var $category = $("<div>").addClass("task-category text-secondary mt-1").text(task.category);
      var $remove = $("<button>")
        .addClass("btn btn-sm btn-outline-secondary")
        .attr("type", "button")
        .text("Remove")
        .on("click", function () {
          removeTask(task.id);
        });

      $text.append($title, $category);
      $row.append($text, $remove);
      $item.append($row);
      $list.append($item);
    });
  }

  function addTask(name, category) {
    var tasks = loadTasks();

    tasks.push({
      id: Date.now(),
      name: name,
      category: category
    });

    saveTasks(tasks);
    renderTasks();
  }

  $("#task-form").on("submit", function (event) {
    event.preventDefault();

    var name = $("#task-name").val().trim();
    var category = $("#task-category").val();

    if (!name) {
      $("#task-name").trigger("focus");
      return;
    }

    addTask(name, category);
    this.reset();
    $("#task-category").val("Bills");
  });

  $("#clear-tasks").on("click", function () {
    localStorage.removeItem(storageKey);
    renderTasks();
  });

  renderTasks();
});
