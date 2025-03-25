import React, { useState, useEffect, useRef } from "react";
import { Table, Form, Button, InputGroup, Row, Col } from "react-bootstrap";
import "./SurgerySchedule.css"; // Import custom styles
import * as XLSX from "xlsx";
import crea_logo from "../assets/images/FINAL_CREA_.png";
import { io } from "socket.io-client";
import { cardData, nextScheduledData } from "../utils/cardDetails";
//const socket = io("http://localhost:5000"); // Connect to backend
import socket from "../Socket";
//const socket = io("http://192.168.0.113:5000"); // Connect to backend

const getStatusColor = (status) => {
  switch (status) {
    case "SCHEDULED":
      return "blue";
    case "WAITING":
      return "orange";
    case "DELAYED":
      return "red";
    case "WHEEL IN":
      return "green";
    case "IN PROGRESS":
      return "yellow";
    default:
      return "gray";
  }
};

const getStatus = (scheduledDatetime, wheelIn, status, caseId, item) => {
  const currentTime = new Date();
  const scheduledDate = new Date(scheduledDatetime); // Convert full datetime string to Date object
  scheduledDate.setMilliseconds(0);
  const fiveMinutesAfter = new Date(scheduledDate.getTime() + 5 * 60000);
  fiveMinutesAfter.setMilliseconds(0);
  if (wheelIn && status != "IN PROGRESS") {
    return "WHEEL IN";
  }
  if (status === "Wheel Out") {
    return "Wheel Out";
  }
  if (status === "IN PROGRESS") {
    return "IN PROGRESS";
  }
  if (currentTime < scheduledDate) {
    return "SCHEDULED";
  } else if (currentTime >= scheduledDate && currentTime <= fiveMinutesAfter) {
    sendMsgToSocket(caseId, "WAITING", item);
    return "WAITING";
  } else if (currentTime > fiveMinutesAfter && !wheelIn) {
    sendDelayedMsgToSocket(caseId, "DELAYED", item);
    return "DELAYED";
  } else if (wheelIn) {
    //console.log("inside wheelin true block");
    return "WHEEL IN";
  }
};

const sentCases = [];
const delayedCases = [];

const sendMsgToSocket = (caseId, sts, item) => {
  if (sentCases.includes(caseId)) {
    return;
  }
  sentCases.push(caseId);
  setTimeout(() => {
    console.log(`✅ Executing socket.emit for caseId: ${caseId}`);
    if (item) {
      item.status = sts;

      socket.emit("push-data", {
        otId: item.otNo,
        ...item,
      });
    }
    // setTimeout(() => {
    //   //console.log(`⏳ Exiting method after 3 seconds for caseId: ${caseId}`);
    //   //sentCases.push(caseId); // Mark caseId as processed
    // }, 5000); // Wait 3 seconds before marking as processed
  }, 5000); // Wait 2 seconds before executing logic
};

const sendDelayedMsgToSocket = (caseId, sts, item) => {
  if (delayedCases.includes(caseId)) {
    return;
  }
  delayedCases.push(caseId);
  setTimeout(() => {
    console.log(`✅ Executing socket.emit for caseId: ${caseId}`);
    if (item) {
      item.status = sts;
      socket.emit("push-data", {
        otId: item.otNo,
        ...item,
      });
    }
    // // After executing, wait for another 3 seconds before exiting
    // setTimeout(() => {
    //   //console.log(`⏳ Exiting method after 3 seconds for caseId: ${caseId}`);
    //   //sentCases.push(caseId); // Mark caseId as processed
    // }, 5000); // Wait 3 seconds before marking as processed
  }, 5000);
};

const speakText = (text) => {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    speechSynthesis.speak(utterance);
  } else {
    console.warn("Speech synthesis is not supported in this browser.");
  }
};

const SurgerySchedule = ({ otCardData }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sampleData, setSampleData] = useState([]);

  // Load data from localStorage on component mount
  useEffect(() => {
    const storedData = localStorage.getItem("otSampleData");
    if (storedData) {
      setSampleData(JSON.parse(storedData));
    }
  }, []);

  useEffect(() => {
    if (otCardData && otCardData.status) {
      console.log("Received otCardData:", otCardData);
      const extractedOtNo = otCardData.otId;
      const extractedCaseId = otCardData.caseId;
      console.log("extractedCaseId value::", extractedCaseId);

      setSampleData((prevData) => {
        console.log("prevData value", prevData);
        const updatedData = prevData.map((item) => {
          const itemDateTime = new Date(item.datetime);
          const currentTime = new Date();
          console.log("item CaseId value::", item.caseId);
          console.log("both value check::", item.caseId === extractedCaseId);
          if (item.caseId === extractedCaseId) {
            console.log("Updating status for OT:", extractedOtNo);
            return {
              ...item,
              status: otCardData.status,
              wheelIn: otCardData.status === "Wheel In" ? true : false,
            };
          }
          return item;
        });

        console.log("Updated Sample Data:", updatedData); // Debugging: Check updated data
        localStorage.setItem("otSampleData", JSON.stringify(updatedData)); // Persist changes
        speakText(
          `Status of OT No ${extractedOtNo} is moved to ${otCardData.status}`
        );
        return updatedData;
      });

      const timeoutDuration =
        otCardData.status === "Wheel In" ? 1 * 60 * 1000 : 5 * 60 * 1000; // 1 min for "Wheel In", 5 min for "Wheel Out"
      console.log("timeutDurationvalue", timeoutDuration);

      // **Schedule Status Change to "IN PROGRESS" after 5 minutes**
      setTimeout(() => {
        console.log("came to set timeout logic..");
        setSampleData((prevData) => {
          let sts;
          if (otCardData.status === "Wheel In") {
            sts = "IN PROGRESS";
          } else if (otCardData.status === "Wheel Out") {
            sts = otCardData.status;
          }
          const updatedData = prevData.map((item) => {
            const itemDateTime = new Date(item.datetime);
            const currentTime = new Date();

            if (item.caseId === extractedCaseId) {
              console.log(`Changing OT-${extractedOtNo} status to ${sts}`);
              return { ...item, status: sts };
            }
            return item;
          });

          console.log("Updated Sample Data after 1 min:", updatedData);
          localStorage.setItem("otSampleData", JSON.stringify(updatedData));
          let filteredCase =
            sts === "IN PROGRESS"
              ? cardData(extractedOtNo, sts, extractedCaseId)
              : nextScheduledData(extractedOtNo);
          if (filteredCase != null) {
            if (sts == "Wheel Out") {
              speakText(
                `Status of OT No ${extractedOtNo} is moved to Next Schedule`
              );
            } else {
              speakText(`Status of OT No ${extractedOtNo} is moved to ${sts}`);
            }
            socket.emit("push-data", {
              otId: filteredCase.otNo,
              ...filteredCase,
            });
          }
          return updatedData;
        });
      }, 1 * 60 * 1000); // **5 minutes delay**
    }
  }, [otCardData]); // Run whenever otCardData updates

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const excelSerialToJSDate = (serial) => {
    const utc_days = Math.floor(serial - 25569); // Excel date starts from 1900-01-01
    const utc_value = utc_days * 86400000; // Convert days to milliseconds
    const date_info = new Date(utc_value); // Create Date object
    const fractional_day = serial - Math.floor(serial);
    const total_seconds = Math.floor(86400 * fractional_day);
    const hours = Math.floor(total_seconds / 3600);
    const minutes = Math.floor((total_seconds - hours * 3600) / 60);
    const seconds = total_seconds - hours * 3600 - minutes * 60;

    return `${date_info.getFullYear()}-${(date_info.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date_info
      .getDate()
      .toString()
      .padStart(2, "0")} ${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(sheet);

      const formattedData = parsedData.map((row, index) => ({
        datetime: excelSerialToJSDate(row["DateTime"]) || "",
        caseId: row["CaseId"] || "",
        procedure: row["Procedure name"] || "",
        surgeon: row["Surgeon Name"] || "",
        patient: row["Patient Details"] || "",
        otNo: row["OT No"] || "",
        status: row["Status"] || "",
        wheelIn: false,
        image: row["Image"] || "",
      }));

      localStorage.setItem("otSampleData", JSON.stringify(formattedData));
      setSampleData(formattedData);

      // Track pushed OT Nos to prevent duplicates
      const pushedOtNos = new Set();

      // Push each OT entry to the WebSocket server
      formattedData.forEach((data) => {
        if (!pushedOtNos.has(data.otNo)) {
          pushedOtNos.add(data.otNo);
          console.log("pushing data of each...");
          const status = getStatus(data.datetime, data.wheelIn, data.status);
          data.status = status;
          socket.emit("push-data", { otId: data.otNo, ...data });
        }
      });
    };

    reader.readAsArrayBuffer(file);
  };

  const handleReset = () => {
    localStorage.removeItem("otSampleData"); // Replace with your actual key
    window.location.reload(); // Refresh if needed
  };

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

  return (
    <div className="table-container">
      <Row>
        <Col xs={10}>
          <Form.Group controlId="fileUpload" className="mb-3">
            <Form.Control
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
          </Form.Group>
        </Col>
        <Col xs={2}>
          <Button variant="outline-primary" onClick={handleReset}>
            Reload Data
          </Button>
        </Col>
      </Row>
      <div className="table-header">
        <img
          className=""
          src={crea_logo}
          style={{ width: "10%", height: "1%" }}
          alt="Crea Logo"
        />
        <h3>SURGERY SCHEDULE</h3>
        <h3>{currentTime.toLocaleTimeString()}</h3>
      </div>

      <table
        className="custom-table"
        borderless={true}
        striped={false}
        hover={false}
        responsive={true}
      >
        <thead>
          <tr>
            <th>Datetime</th>
            <th>Case Id</th>
            <th>Procedure</th>
            <th>Surgeon</th>
            <th>Patient</th>
            <th>Ot No</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sampleData.map((item) => {
            const status = getStatus(
              item.datetime,
              item.wheelIn,
              item.status,
              item.caseId,
              item
            );
            return (
              <tr>
                <td>{formatDateTime(item.datetime)}</td>
                <td>{item.caseId}</td>
                <td>{item.procedure}</td>
                <td>{item.surgeon}</td>
                <td>{item.patient}</td>
                <td>{item.otNo}</td>
                <td>
                  {status}{" "}
                  <span
                    className={`status-indicator ${
                      status === "IN PROGRESS" ? "blink" : ""
                    }`}
                    style={{ backgroundColor: getStatusColor(status) }}
                  ></span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SurgerySchedule;
