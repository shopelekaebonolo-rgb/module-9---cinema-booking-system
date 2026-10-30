// =====================================================================
// db.js - reusable helper functions for reading and writing Firestore
// Other files import these instead of repeating Firestore code everywhere.
// Terms: a "collection" is like a table (e.g. "Bookings"),
//        a "document" is like one row in it, with its own unique ID.
// =====================================================================

// Import the database object created in config.js.
import {db} from '../config.js'

// Import the Firestore functions we need from Google's servers.
import {
  collection, // points to a whole collection (e.g. all Bookings)
  doc,        // points to one specific document inside a collection
  addDoc,     // adds a new document and lets Firestore make up the ID
  setDoc,     // writes a document at an ID that WE choose
  getDoc,     // reads one document
  getDocs,    // reads many documents at once
  updateDoc,  // changes only some fields of an existing document
  deleteDoc   // removes a document
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js"

// ---------------------------------------------------------------------
// 1. GET EVERYTHING in a collection
// Example: getAllData("MovieTickets") returns an array of all movies.
// ---------------------------------------------------------------------
export async function getAllData(collectionName){
    // Ask Firestore for every document in the collection and wait for the answer.
    const snapshot = await getDocs(collection(db, collectionName))

    // snapshot.docs is a list of raw Firestore documents.
    // .map() turns each one into a normal JavaScript object:
    return snapshot.docs.map((document)=>({
        id:document.id,      // the document's ID (stored separately by Firestore)
        ...document.data()   // all the fields inside it (title, price, etc.), copied in
    }))
}

// ---------------------------------------------------------------------
// 2. SAVE with an automatically generated ID
// Used for things like new bookings, where we don't care what the ID is.
// ---------------------------------------------------------------------
// Save data with an automatically generated ID
export async function saveData(collectionName, data){
    // addDoc creates a new document in the collection and fills it with "data".
    // It returns a reference to the new document.
    const docRef = await addDoc(
        collection(db, collectionName),
        data
    )
    // Return the new ID so the caller can remember it (booking.js stores it as firestoreId).
    return docRef.id;
}

// ---------------------------------------------------------------------
// 3. SAVE with an ID that we choose
// If a document with that ID already exists, it is completely replaced.
// ---------------------------------------------------------------------
// Save data using a specific document ID
export async function saveDataWithID(collectionName, id, data){
    // doc(db, collectionName, id) = the exact address; setDoc writes the data there.
    await setDoc(doc(db, collectionName, id), data);
    // Hand the ID back for convenience.
    return id;
}

// ---------------------------------------------------------------------
// 4. GET ONE document by its ID
// Example: getDataById("users", user.uid) returns that user's profile.
// ---------------------------------------------------------------------
//Retrieve one document by ID
export async function getDataById(collectionName, id) {
    // Fetch the document at that address and wait for the result.
    const snapshot = await getDoc(
        doc(db, collectionName, id)
    )

    // If nothing exists at that address, return null so callers can check for it.
    if (!snapshot.exists()){
        return null;
    }

    // Otherwise return a normal object: the ID plus all the stored fields.
    return{
        id: snapshot.id,
        ...snapshot.data()
    }
} 

// ---------------------------------------------------------------------
// 5. UPDATE some fields of an existing document
// Fields you don't mention stay as they were. It fails if the document doesn't exist.
// Example: updateData("FoodOrders", id, { status: "dispatched" })
// ---------------------------------------------------------------------
//update an existing document
export async function updateData(collectionName, id, data){
    await updateDoc(
        doc(db, collectionName, id), // which document
        data                         // which fields to change, and their new values
    )
}

// ---------------------------------------------------------------------
// 6. DELETE a document
// Note: the parameter is spelled "collecionName" (missing a "t"). It still works
// because it is spelled the same way both times, but "collectionName" would be tidier.
// ---------------------------------------------------------------------
//6. Delete a document
export async function deleteData(collecionName, id){
    await deleteDoc (
        doc(db, collecionName, id) // the address of the document to remove
    );
}