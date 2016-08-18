// Strict mode
"use strict";

var fs = require('fs');
var doctor_file = JSON.parse(fs.readFileSync('./config/doctors.json'));

/**
 * Returns a list of doctor's CSP Ids for whom scorecards should be generated
 * 
 * @returns {array} a list of doctor's CSP Ids for whom scorecards should be
 *          generated
 */
var getDoctors = function() {
    return Object.keys(doctor_file);
};

/**
 * Returns a object containing configuration information for the doctor with the
 * CSP Id passed
 * 
 * @param doctor
 *                {string} The CSP Id for which to return information
 * @returns {object} A object containing configuration information for the
 *          doctor with the CSP Id passed
 */
var getDoctorInfo = function(doctor) {
    return doctor_file[doctor];
}

module.exports = {
    getDoctors : getDoctors,
    getDoctorInfo : getDoctorInfo
};
