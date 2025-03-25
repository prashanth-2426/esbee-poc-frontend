import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Container, Dropdown, Row, Col } from "react-bootstrap";
import "./OTCard.css"; // Import the CSS file
import crea_logo from "../assets/images/FINAL_CREA_.png";
import { io } from "socket.io-client";
//const socket = io("http://localhost:5000"); // Connect to backend
import socket from "../Socket";
//const socket = io("http://192.168.0.113:5000"); // Connect to backend

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

  // Function to determine the color based on status
  const getStatusColor = (status) => {
    switch (status) {
      case "SCHEDULED":
        return "blue";
      case "WAITING":
        return "orange";
      case "DELAYED":
        return "red";
      case "Wheel In":
        return "green";
      case "IN PROGRESS":
        return "yellow";
      default:
        return "gray";
    }
  };

  // Function to format date to dd-mm-yyyy
  // Function to format date as dd-mm-yyyy hh:mm:ss
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  };

  // Handle status change event
  const handleStatusChange = (newStatus) => {
    console.log(`Status changed to: ${newStatus}`);

    // Immediately update the state to reflect the new status in UI
    setData((prevData) => ({
      ...prevData,
      status: newStatus,
    }));
    socket.emit("updated-status-manually", {
      cam_name: otId,
      status: newStatus,
      caseId: data.caseId,
    });
  };

  return (
    <div className="ot-container">
      <Card className="ot-card text-white">
        <Card.Body className="ot-card-body">
          {/* Header Section */}
          <div className="ot-header">
            <img
              className=""
              src={crea_logo}
              style={{ width: "10%", height: "80%" }}
              alt="Crea Logo"
            />
            <span className="ot-number">
              OT No. {otId} - {data?.caseId}
            </span>
          </div>

          {/* Body Section */}
          {/* <div className="ot-content">
            <h6 className="procedure">{data?.procedure}</h6>
            <p className="doctor">Surgeon: {data?.surgeon}</p>
            <p className="patient">Patient: {data?.patient}</p>
          </div> */}

          <Row className="gx-0 align-items-center">
            <Col xs={12} md={6} className="text-end">
              <h6 className="procedure">{data?.procedure}</h6>
              <p className="doctor">Surgeon: {data?.surgeon}</p>
              <p className="patient">Patient: {data?.patient}</p>
            </Col>
            <Col xs={12} md={6} className="text-center">
              <img src={data?.image} height="360" alt="surgeon image" />
            </Col>
          </Row>

          {/* Footer Section */}
          <div className="ot-footer">
            <span className="status-text">{data ? data?.status : ""}</span>
            <span className="time">{formatDateTime(data?.datetime)}</span>
            <span
              className="status-dot"
              style={{ backgroundColor: getStatusColor(data?.status) }}
            ></span>

            {/* Dropdown for status selection */}
            {data?.status !== undefined &&
              data?.status !== null &&
              data?.status !== "" &&
              data?.status !== "Wheel Out" &&
              data?.status !== "Wheel In" &&
              data?.status !== "IN PROGRESS" && (
                <Dropdown>
                  <Dropdown.Toggle variant="primary" id="dropdown-basic">
                    Change Status
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item
                      onClick={() => handleStatusChange("Wheel In")}
                    >
                      Wheel In
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}

            {data?.status === "IN PROGRESS" && (
              <Dropdown>
                <Dropdown.Toggle variant="primary" id="dropdown-basic">
                  Change Status
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item
                    onClick={() => handleStatusChange("Wheel Out")}
                  >
                    Wheel Out
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default OTCard;
