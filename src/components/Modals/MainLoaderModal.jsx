import React from "react";

import "../../styles/MainLoaderModal.css";

const MainLoaderModal = ({ title = "AI Assistant", logo = "/NVlogo.jpg" }) => {
  return (
    <div className="main-loader-overlay">
      <div className="main-loader-card">
        <img src={logo} alt="NewVision" className="main-loader-logo" />
        <h5 className="main-loader-title">{title}</h5>
        <div className="main-loader-spinner">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

export default MainLoaderModal;
