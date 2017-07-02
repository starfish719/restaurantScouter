const vision = require('@google-cloud/vision')({
    projectId: process.env.GCP_PROJECT
});

const async = require('async');
const httpcli = require('cheerio-httpcli');

/**
 * Responds to any HTTP request that can provide a "message" field in the body.
 *
 * @param {!Object} req Cloud Function request context.
 * @param {!Object} res Cloud Function response context.
 */
exports.api = function helloWorld (req, res) {

    res.header('Content-Type','application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.body.base64 === undefined) {
        // This is an error case, as "message" is required.
        res.status(400).send('No message defined!');
        return;
    }

    res.status(200).send({status: 'success'});
};