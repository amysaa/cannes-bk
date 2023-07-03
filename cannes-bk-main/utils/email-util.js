const nodemailer = require("nodemailer");
const path = require("path");

let transporter = nodemailer.createTransport({
  service: "hotmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

exports.sendMail = async function (options) {
  console.log(options);
  transporter.sendMail(
    {
      from: "herculesproject7@outlook.com",
      to: options.email,
      subject: options.subject,
      html: options.html,
      attachments: options.path && [
        {
          path: path.join(
            __dirname,
            "../",
            "ordersPDFs",
            `${options.path}.pdf`
          ),
        },
      ],
    },
    (err, inf) => {
      if (err) {
        console.log(err);
        console.log("EMAIL SENT FAILED");
        return;
      }
      console.log("EMAIL SENT SUCCESSFULLY");
    }
  );
};
