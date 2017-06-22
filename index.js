const vision = require('@google-cloud/vision')({
    projectId: process.env.GCP_PROJECT
});

const storage = require('@google-cloud/storage')({
    projectId: process.env.GCP_PROJECT
});

const async = require('async');

/**
 * Triggered from a message on a Cloud Storage bucket.
 *
 * @param {!Object} event The Cloud Functions event.
 * @param {!Function} The callback function.
 */
exports.processFile = function(event, callback) {
    const eventData = event.data;
    const file = storage.bucket(eventData.bucket).file(eventData.name);
    if (eventData.resourceState === 'not_exists') {
        console.log(`File ${eventData.name} deleted.`);
        callback();
    } else if (eventData.metageneration === '1') {
        async.waterfall([
            function (waterCallback){
                vision.detectText(file, function(err, text, apiResponse) {
                    console.log('err:' + JSON.stringify(err));

                    waterCallback(null, text);
                });
            },
            function (text, waterCallback) {
                console.log('text:' + text);
                waterCallback(null, "result");
            },
        ], function (err, result) {
            if (err) {
                throw err;
            }
            console.log('waterfall all done. ', result);

            callback();
        });
    } else {
        console.log(`File ${eventData.name} metadata updated.`);
        callback();
    }
};