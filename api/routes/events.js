const express = require("express");
const router = express.Router();
const db = require("../database");

// Get all events
router.get("/", async (req, res) => {
  try {
    const events = await getAllEvents();
    res.json({ success: true, data: events });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get upcoming events
router.get("/upcoming", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const events = await getUpcomingEvents(limit);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get event by ID
router.get("/:id", async (req, res) => {
  try {
    const event = await getEventById(req.params.id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    res.json({ success: true, data: event });
  } catch (error) {
    console.error(`Error fetching event ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create event
router.post("/", async (req, res) => {
  try {
    const result = await createEvent(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update event
router.put("/:id", async (req, res) => {
  try {
    const result = await updateEvent(req.params.id, req.body);
    if (!result.success) {
      if (result.message && result.message.includes("not found")) {
        return res.status(404).json(result);
      }
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error(`Error updating event ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete event
router.delete("/:id", async (req, res) => {
  try {
    const result = await deleteEvent(req.params.id);
    if (!result.success) {
      if (result.message && result.message.includes("not found")) {
        return res.status(404).json(result);
      }
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error(`Error deleting event ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Database access functions
async function getAllEvents() {
  return new Promise((resolve, reject) => {
    db.db.all("SELECT * FROM events ORDER BY start_date DESC", (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

async function getUpcomingEvents(limit) {
  const today = new Date().toISOString().split("T")[0];
  return new Promise((resolve, reject) => {
    db.db.all(
      "SELECT * FROM events WHERE start_date >= ? ORDER BY start_date ASC LIMIT ?",
      [today, limit],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows || []);
      }
    );
  });
}

async function getEventById(eventId) {
  return new Promise((resolve, reject) => {
    db.db.get(
      "SELECT * FROM events WHERE event_id = ?",
      [eventId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      }
    );
  });
}

async function createEvent(eventData) {
  const { title, description, start_date, end_date, location, type } =
    eventData;

  if (!title || !start_date) {
    return { success: false, message: "Title and start date are required" };
  }

  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.db.run(
      `INSERT INTO events (
        title, description, start_date, end_date, location, type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        start_date,
        end_date || null,
        location || null,
        type || "general",
        now,
        now,
      ],
      function (err) {
        if (err) {
          resolve({ success: false, message: err.message });
          return;
        }

        db.db.get(
          "SELECT * FROM events WHERE event_id = ?",
          [this.lastID],
          (err, row) => {
            if (err) {
              resolve({ success: false, message: err.message });
              return;
            }
            resolve({
              success: true,
              data: row,
              message: "Event created successfully",
            });
          }
        );
      }
    );
  });
}

async function updateEvent(eventId, eventData) {
  const { title, description, start_date, end_date, location, type } =
    eventData;

  if (!title || !start_date) {
    return { success: false, message: "Title and start date are required" };
  }

  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.db.run(
      `UPDATE events SET
        title = ?, 
        description = ?,
        start_date = ?,
        end_date = ?,
        location = ?,
        type = ?,
        updated_at = ?
      WHERE event_id = ?`,
      [
        title,
        description || null,
        start_date,
        end_date || null,
        location || null,
        type || "general",
        now,
        eventId,
      ],
      function (err) {
        if (err) {
          resolve({ success: false, message: err.message });
          return;
        }

        if (this.changes === 0) {
          resolve({ success: false, message: "Event not found" });
          return;
        }

        db.db.get(
          "SELECT * FROM events WHERE event_id = ?",
          [eventId],
          (err, row) => {
            if (err) {
              resolve({ success: false, message: err.message });
              return;
            }
            resolve({
              success: true,
              data: row,
              message: "Event updated successfully",
            });
          }
        );
      }
    );
  });
}

async function deleteEvent(eventId) {
  return new Promise((resolve, reject) => {
    db.db.run(
      "DELETE FROM events WHERE event_id = ?",
      [eventId],
      function (err) {
        if (err) {
          resolve({ success: false, message: err.message });
          return;
        }

        if (this.changes === 0) {
          resolve({ success: false, message: "Event not found" });
          return;
        }

        resolve({ success: true, message: "Event deleted successfully" });
      }
    );
  });
}

module.exports = router;
