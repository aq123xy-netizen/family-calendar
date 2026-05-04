(function () {
  var calendarElement = document.getElementById("calendar");
  var legendElement = document.getElementById("calendar-legend");
  var selectedDateTitle = document.getElementById("selected-date-title");
  var selectedDateEvents = document.getElementById("selected-date-events");
  var openEventFormButton = document.getElementById("open-event-form");
  var closeEventFormButton = document.getElementById("close-event-form");
  var eventModalElement = document.getElementById("event-modal");
  var eventForm = document.getElementById("calendar-event-form");
  var eventFormHeading = document.getElementById("event-form-heading");
  var eventFormCopy = document.getElementById("event-form-copy");
  var eventFormError = document.getElementById("event-form-error");
  var eventTitleInput = document.getElementById("event-title");
  var eventDateTimeInput = document.getElementById("event-datetime");
  var eventPersonInput = document.getElementById("event-person");
  var eventColorInput = document.getElementById("event-color");
  var saveEventButton = document.getElementById("save-event-button");
  var extraEventsKey = "family-calendar-extra-events";
  var eventOverridesKey = "family-calendar-event-overrides";
  var eventDeletionsKey = "family-calendar-event-deletions";
  var editingEventId = null;
  var selectedDate = null;
  var eventModal = eventModalElement && window.bootstrap ? new window.bootstrap.Modal(eventModalElement) : null;

  if (!calendarElement || !window.FullCalendar) {
    return;
  }

  function readJsonStorage(key, fallbackValue) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallbackValue;
    } catch (error) {
      return fallbackValue;
    }
  }

  function writeJsonStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function loadExtraEvents() {
    return readJsonStorage(extraEventsKey, []);
  }

  function saveExtraEvents(events) {
    writeJsonStorage(extraEventsKey, events);
  }

  function loadEventOverrides() {
    return readJsonStorage(eventOverridesKey, {});
  }

  function saveEventOverrides(overrides) {
    writeJsonStorage(eventOverridesKey, overrides);
  }

  function loadDeletedIds() {
    return readJsonStorage(eventDeletionsKey, []);
  }

  function saveDeletedIds(ids) {
    writeJsonStorage(eventDeletionsKey, ids);
  }

  function setFormVisibility(isVisible) {
    if (!eventModal) {
      return;
    }

    if (isVisible) {
      eventModal.show();
      return;
    }

    eventModal.hide();
  }

  function formatHeading(dateString) {
    return new Date(dateString + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatTime(timeString) {
    if (!timeString) {
      return "All day";
    }

    return new Date("1970-01-01T" + timeString).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function buildDateTimeValue(dateString, timeString) {
    return dateString + "T" + (timeString || "00:00");
  }

  function splitDateTimeValue(dateTimeValue) {
    var parts = dateTimeValue.split("T");

    return {
      date: parts[0],
      time: parts[1] || ""
    };
  }

  function hideFormError() {
    if (!eventFormError) {
      return;
    }

    eventFormError.textContent = "";
    eventFormError.classList.add("d-none");
  }

  function showFormError(message) {
    if (!eventFormError) {
      return;
    }

    eventFormError.textContent = message;
    eventFormError.classList.remove("d-none");
  }

  function renderLegend(events) {
    var people = [];
    var peopleMap = {};

    events.forEach(function (event) {
      if (!peopleMap[event.person]) {
        peopleMap[event.person] = true;
        people.push({
          person: event.person,
          color: event.color
        });
      }
    });

    legendElement.innerHTML = people.map(function (entry) {
      return [
        '<span class="legend-chip">',
        '<span class="legend-dot" style="background:', entry.color, '"></span>',
        entry.person,
        "</span>"
      ].join("");
    }).join("");
  }

  function renderSelectedDate(dateString, events) {
    selectedDate = dateString;
    selectedDateTitle.textContent = formatHeading(dateString);

    if (!events.length) {
      selectedDateEvents.innerHTML = '<p class="text-secondary mb-0">No events scheduled for this day.</p>';
      return;
    }

    selectedDateEvents.innerHTML = events.map(function (event) {
      return [
        '<div class="selected-event-item" data-event-id="', event.id, '">',
        '<div class="selected-event-body">',
        '<span class="selected-event-dot" style="background:', event.color, '"></span>',
        '<div>',
        '<div class="selected-event-person">', event.person, "</div>",
        '<div class="selected-event-title">', event.title, "</div>",
        '<div class="selected-event-time">', formatTime(event.time), "</div>",
        "</div>",
        "</div>",
        '<div class="selected-event-actions">',
        '<button class="btn btn-sm btn-outline-secondary event-edit-button" type="button" data-event-id="', event.id, '">Edit</button>',
        '<button class="btn btn-sm btn-outline-danger event-delete-button" type="button" data-event-id="', event.id, '">Delete</button>',
        "</div>",
        "</div>"
      ].join("");
    }).join("");
  }

  function resetEventForm() {
    editingEventId = null;
    eventForm.reset();
    eventColorInput.value = "#4285f4";
    hideFormError();
    if (selectedDate) {
      eventDateTimeInput.value = buildDateTimeValue(selectedDate, "");
    }
    eventFormHeading.textContent = "New calendar event";
    eventFormCopy.textContent = "Add an event for one person and it will appear right away.";
    saveEventButton.textContent = "Save event";
  }

  function beginEditEvent(eventData) {
    editingEventId = eventData.id;
    eventTitleInput.value = eventData.title;
    eventDateTimeInput.value = buildDateTimeValue(eventData.date, eventData.time);
    eventPersonInput.value = eventData.person;
    eventColorInput.value = eventData.color;
    eventFormHeading.textContent = "Edit calendar event";
    eventFormCopy.textContent = "Update the details below and save your changes.";
    saveEventButton.textContent = "Update event";
    setFormVisibility(true);
    eventTitleInput.focus();
  }

  fetch("assets/events.json")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load events.json");
      }

      return response.json();
    })
    .then(function (events) {
      var baseEvents = events.map(function (event, index) {
        return Object.assign({
          id: event.id || "seed-" + (index + 1)
        }, event);
      });
      var extraEvents = loadExtraEvents();
      var eventOverrides = loadEventOverrides();
      var deletedIds = loadDeletedIds();
      var calendar;

      extraEvents = extraEvents.map(function (event, index) {
        return Object.assign({
          id: event.id || "local-migrated-" + Date.now() + "-" + index
        }, event);
      });
      saveExtraEvents(extraEvents);

      function getAllEvents() {
        return baseEvents.concat(extraEvents)
          .filter(function (event) {
            return deletedIds.indexOf(event.id) === -1;
          })
          .map(function (event) {
            return Object.assign({}, event, eventOverrides[event.id] || {});
          });
      }

      function buildCalendarEvents(sourceEvents) {
        return sourceEvents.map(function (event) {
          return {
            id: event.id,
            title: event.title,
            start: event.time ? event.date + "T" + event.time : event.date,
            allDay: !event.time,
            backgroundColor: event.color,
            borderColor: event.color,
            extendedProps: {
              person: event.person,
              color: event.color,
              time: event.time || ""
            }
          };
        });
      }

      function findEventById(id) {
        return getAllEvents().find(function (event) {
          return event.id === id;
        });
      }

      function saveOrUpdateEvent(eventData) {
        var existingExtraIndex = extraEvents.findIndex(function (event) {
          return event.id === eventData.id;
        });
        var existsInBaseEvents = baseEvents.some(function (event) {
          return event.id === eventData.id;
        });

        if (existingExtraIndex >= 0) {
          extraEvents[existingExtraIndex] = eventData;
          saveExtraEvents(extraEvents);
          return;
        }

        if (!existsInBaseEvents) {
          extraEvents.push(eventData);
          saveExtraEvents(extraEvents);
          return;
        }

        eventOverrides[eventData.id] = {
          title: eventData.title,
          date: eventData.date,
          person: eventData.person,
          time: eventData.time,
          color: eventData.color
        };
        saveEventOverrides(eventOverrides);
      }

      function deleteEventById(id) {
        var existingExtraIndex = extraEvents.findIndex(function (event) {
          return event.id === id;
        });

        if (existingExtraIndex >= 0) {
          extraEvents.splice(existingExtraIndex, 1);
          saveExtraEvents(extraEvents);
        } else if (deletedIds.indexOf(id) === -1) {
          deletedIds.push(id);
          saveDeletedIds(deletedIds);
        }

        if (eventOverrides[id]) {
          delete eventOverrides[id];
          saveEventOverrides(eventOverrides);
        }
      }

      function refreshCalendar() {
        var allEvents = getAllEvents();

        calendar.removeAllEvents();
        buildCalendarEvents(allEvents).forEach(function (event) {
          calendar.addEvent(event);
        });
        renderLegend(allEvents);

        if (selectedDate) {
          renderSelectedDate(selectedDate, allEvents.filter(function (event) {
            return event.date === selectedDate;
          }));
        }
      }

      var allEvents = getAllEvents();

      calendar = new FullCalendar.Calendar(calendarElement, {
        initialView: "dayGridMonth",
        height: "auto",
        fixedWeekCount: false,
        headerToolbar: {
          left: "prev,next today",
          center: "title",
          right: ""
        },
        buttonText: {
          today: "Today"
        },
        events: buildCalendarEvents(allEvents),
        eventDidMount: function (info) {
          var timeText = info.event.extendedProps.time ? formatTime(info.event.extendedProps.time) + " - " : "";
          var fullText = timeText + info.event.title + " (" + info.event.extendedProps.person + ")";

          info.el.setAttribute("title", fullText);
          info.el.style.backgroundColor = info.event.backgroundColor;
          info.el.style.borderColor = info.event.borderColor;
          info.el.style.color = "#ffffff";
        },
        dayMaxEventRows: 3,
        dateClick: function (info) {
          eventDateTimeInput.value = buildDateTimeValue(info.dateStr, "");

          var selected = getAllEvents().filter(function (event) {
            return event.date === info.dateStr;
          });

          renderSelectedDate(info.dateStr, selected);
        },
        eventClick: function (info) {
          var clickedDate = info.event.startStr.slice(0, 10);
          var selected = getAllEvents().filter(function (event) {
            return event.date === clickedDate;
          });
          var clickedEvent = findEventById(info.event.id);

          renderSelectedDate(clickedDate, selected);

          if (clickedEvent) {
            beginEditEvent(clickedEvent);
          }
        }
      });

      calendar.render();

      var todayString = new Date().toISOString().slice(0, 10);
      var initialDate = allEvents.some(function (event) {
        return event.date === todayString;
      }) ? todayString : (allEvents[0] ? allEvents[0].date : todayString);

      renderSelectedDate(initialDate, allEvents.filter(function (event) {
        return event.date === initialDate;
      }));
      resetEventForm();

      if (openEventFormButton) {
        openEventFormButton.addEventListener("click", function () {
          resetEventForm();
          setFormVisibility(true);
          eventTitleInput.focus();
        });
      }

      if (closeEventFormButton) {
        closeEventFormButton.addEventListener("click", function () {
          resetEventForm();
        });
      }

      if (eventForm) {
        eventForm.addEventListener("submit", function (submitEvent) {
          submitEvent.preventDefault();

          hideFormError();

          var selectedDateTime = eventDateTimeInput.value;
          var selectedDateObject = selectedDateTime ? new Date(selectedDateTime) : null;
          var now = new Date();

          var eventData = {
            id: editingEventId || "local-" + Date.now(),
            title: eventTitleInput.value.trim(),
            date: splitDateTimeValue(selectedDateTime).date,
            person: eventPersonInput.value.trim(),
            time: splitDateTimeValue(selectedDateTime).time,
            color: eventColorInput.value
          };

          if (!eventData.title || !eventData.date || !eventData.person) {
            return;
          }

          if (!selectedDateObject || Number.isNaN(selectedDateObject.getTime())) {
            showFormError("Please enter a valid date and time.");
            return;
          }

          if (selectedDateObject < now) {
            showFormError("You cannot create or update an event in the past.");
            return;
          }

          saveOrUpdateEvent(eventData);
          selectedDate = eventData.date;
          refreshCalendar();
          resetEventForm();
          setFormVisibility(false);
        });
      }

      if (eventModalElement) {
        eventModalElement.addEventListener("hidden.bs.modal", function () {
          resetEventForm();
        });
      }

      selectedDateEvents.addEventListener("click", function (clickEvent) {
        var editButton = clickEvent.target.closest(".event-edit-button");
        var deleteButton = clickEvent.target.closest(".event-delete-button");

        if (editButton) {
          var eventToEdit = findEventById(editButton.getAttribute("data-event-id"));
          if (eventToEdit) {
            beginEditEvent(eventToEdit);
          }
          return;
        }

        if (deleteButton) {
          deleteEventById(deleteButton.getAttribute("data-event-id"));
          refreshCalendar();
        }
      });
    })
    .catch(function () {
      selectedDateTitle.textContent = "Calendar unavailable";
      selectedDateEvents.innerHTML = '<p class="text-secondary mb-0">The events file could not be loaded.</p>';
    });
})();
