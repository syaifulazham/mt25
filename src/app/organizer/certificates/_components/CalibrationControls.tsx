import React from 'react';

export interface CalibrationSettings {
  scaleX: number;
  scaleY: number;
  offsetY: number;
  baselineRatio: number;
}

interface CalibrationControlsProps {
  calibration: CalibrationSettings;
  onCalibrationChange: (newCalibration: CalibrationSettings) => void;
}

const DEFAULT_CALIBRATION: CalibrationSettings = {
  scaleX: 1,
  scaleY: 1,
  offsetY: 0,
  baselineRatio: 0.35
};

const CalibrationControls: React.FC<CalibrationControlsProps> = ({ 
  calibration = DEFAULT_CALIBRATION, 
  onCalibrationChange 
}) => {
  const handleChange = (key: keyof CalibrationSettings, value: string) => {
    const numValue = parseFloat(value);
    
    // Validate the number is valid before updating
    if (!isNaN(numValue)) {
      onCalibrationChange({
        ...calibration,
        [key]: numValue
      });
    }
  };

  const handleReset = () => {
    onCalibrationChange(DEFAULT_CALIBRATION);
  };

  return (
    <div className="border border-gray-200 rounded-md p-4 bg-white space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">PDF Calibration Settings</h3>
        <button 
          type="button" 
          onClick={handleReset}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
        >
          Reset to Default
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Scale X ({calibration.scaleX})
          </label>
          <input
            type="range"
            min="0.8"
            max="1.2"
            step="0.01"
            value={calibration.scaleX}
            onChange={(e) => handleChange('scaleX', e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Scale Y ({calibration.scaleY})
          </label>
          <input
            type="range"
            min="0.8"
            max="1.2"
            step="0.01"
            value={calibration.scaleY}
            onChange={(e) => handleChange('scaleY', e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Vertical Offset ({calibration.offsetY})
          </label>
          <input
            type="range"
            min="-50"
            max="20"
            step="1"
            value={calibration.offsetY}
            onChange={(e) => handleChange('offsetY', e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Baseline Ratio ({calibration.baselineRatio.toFixed(2)})
          </label>
          <input
            type="range"
            min="0.1"
            max="0.6"
            step="0.01"
            value={calibration.baselineRatio}
            onChange={(e) => handleChange('baselineRatio', e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-1">
        Adjust these values to fine-tune text positioning in the generated PDF.
        <ul className="list-disc list-inside mt-1">
          <li>Scale X/Y: Affects overall element positioning</li>
          <li>Vertical Offset: Adjusts text position up/down</li>
          <li>Baseline Ratio: Affects vertical text alignment</li>
        </ul>
      </div>
    </div>
  );
};

export default CalibrationControls;
