import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Container } from "react-bootstrap";
import "./OTCard.css"; // Import the CSS file
import { io } from "socket.io-client";
//const socket = io("http://localhost:5000"); // Connect to backend
const socket = io("http://192.168.0.113:5000"); // Connect to backend

const OTCard = () => {
  const { otId } = useParams(); // Get the OT ID from URL
  const [data, setData] = useState(null);
  const [otstatusdata, setOtStatusData] = useState(null);

  console.log("Received OT ID:", otId); // Debugging: Check if otId is being received

  useEffect(() => {
    // Register this peer as the OTCard viewer
    socket.emit("register-otcard-peer", { otId });

    // Listen for data from the main peer
    socket.on("receive-data", (receivedData) => {
      console.log("Data received:", receivedData);
      setData(receivedData);
    });

    socket.on("receive-otstatus-data", (receivedOtStatusData) => {
      console.log("Data received on upload sheet:", receivedOtStatusData);
      setData(receivedOtStatusData);
    });

    return () => {
      socket.off("receive-data"); // Cleanup listener on unmount
      socket.off("receive-otstatus-data"); // Cleanup listener on unmount
    };
  }, []);

  return (
    <div className="ot-container">
      <Card className="ot-card text-white">
        <Card.Body className="ot-card-body">
          {/* Header Section */}
          <div className="ot-header">
            <span className="ot-number">OT No. {otId}</span>
            <span className="time">9:00 am</span>
          </div>

          {/* Body Section */}
          <div className="ot-content">
            <h6 className="procedure">{data?.procedure}</h6>
            <p className="doctor">Surgeon: {data?.surgeon}</p>
            <p className="patient">Patient: {data?.patient}</p>
          </div>

          {/* Footer Section */}
          <div className="ot-footer">
            <span className="status-text">{data ? data?.status : ""}</span>
            <span className="status-dot"></span>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default OTCard;
