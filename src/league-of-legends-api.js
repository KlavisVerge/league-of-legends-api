require('dotenv/config');
const AWS = require('aws-sdk');
const request = require('request-promise');
AWS.config.update({region: 'us-east-1'});

exports.handler = (event, context) => {
    if(event){
        if(!event.body){
            event.body = {};
        }else if(typeof event.body === 'string'){
            event.body = JSON.parse(event.body);
        }
    }
    // const required = ['platform', 'epicNickname'].filter((property) => !event.body[property]);
    // if(required.length > 0){
    //     return Promise.reject({
    //         statusCode: 400,
    //         message: `Required properties missing: "${required.join('", "')}".`
    //     });
    // }
    let promises = [];
    var options = {
        url: 'https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/RiotSchmick?api_key=' + process.env.API_KEY,
        // url: 'https://api.fortnitetracker.com/v1/profile/' + event.body.platform + '/' + event.body.epicNickname,
        // headers: {
        //     'TRN-Api-Key': process.env.API_KEY
        // }
    };
    promises.push(request(options).promise().then((res) => {
        return res;
    }).catch(function (err) {
        return Promise.reject({
            statusCode: err.statusCode,
            message: 'Error interacting with Riot Games API.'
        });
    }));

    return Promise.all(promises).then((responses) => {
        const[results] = responses;
        return context.succeed({
            statusCode: 200,
            body: JSON.stringify(results),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,XAmz-Security-Token',
                'Access-Control-Allow-Origin': '*'
            }
        });
    });
}




// BR	BR1	br1.api.riotgames.com
// EUNE	EUN1	eun1.api.riotgames.com
// EUW	EUW1	euw1.api.riotgames.com
// JP	JP1	jp1.api.riotgames.com
// KR	KR	kr.api.riotgames.com
// LAN	LA1	la1.api.riotgames.com
// LAS	LA2	la2.api.riotgames.com
// NA	NA1, NA *	na1.api.riotgames.com
// OCE	OC1	oc1.api.riotgames.com
// TR	TR1	tr1.api.riotgames.com
// RU	RU	ru.api.riotgames.com
// PBE	PBE1	pbe1.api.riotgames.com