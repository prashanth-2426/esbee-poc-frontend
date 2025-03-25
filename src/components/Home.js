import { useState, useEffect, useRef } from "react";
import {
  Form,
  Table,
  Container,
  Row,
  Col,
  Card,
  Button,
} from "react-bootstrap";
import { Clock } from "lucide-react";
import { TbBackground } from "react-icons/tb";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

import SurgerySchedule from "./SurgerySchedule";
import { io } from "socket.io-client";
import { cardData } from "../utils/cardDetails";
import socket from "../Socket"; // Import the shared socket instance
//const socket = io("http://192.168.0.113:5000"); // Connect to backend

export default function Home() {
  const [selectedTheater, setSelectedTheater] = useState("Theater 1");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [responseData, setResponseData] = useState(null); // State to store API response

  const [otCardData, setOtCardData] = useState(null); // State to pass data to child
  const webcamRef = useRef(null);
  const usbCameraRef = useRef(null);
  const backendUrl = "http://127.0.0.1:5000/otfeed"; // Replace with your backend URL
  const backendUrlYoco = "http://127.0.0.1:5000/otfeed"; // Replace with your backend URL

  useEffect(() => {
    socket.on("wheel_in_detected", (data) => {
      console.log("Wheel In detected:", data);
      sendDataToOTCard(data.cam_name, data.status, data.caseId);
    });

    socket.on("wheel_out_detected", (data) => {
      console.log("Wheel Out detected:", data);
      sendDataToOTCard(data.cam_name, data.status, data.caseId);
    });

    return () => {
      socket.off("wheel_in_detected");
      socket.off("wheel_out_detected");
    };
  }, []);

  const sendDataToOTCard = (cameraId, status, caseId) => {
    console.log("Sending data to OT Card");
    console.log("cameraid value", cameraId);

    let filteredCase = cardData(cameraId, status, caseId);
    socket.emit("push-data", { otId: filteredCase.otNo, ...filteredCase });

    const sampleData = {
      status: status,
      timestamp: Date.now(),
      otId: cameraId,
      caseId: filteredCase.caseId,
    };
    console.log("sameple data value", sampleData);

    // Update state so SurgerySchedule receives it
    setOtCardData(sampleData);
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <main className="flex-grow p-4">
        <SurgerySchedule otCardData={otCardData} />
      </main>

      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>&copy; 2023 Operation Theater Monitor. All rights reserved.</p>
      </footer>
    </div>
  );
}
