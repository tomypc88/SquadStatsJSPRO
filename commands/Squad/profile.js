const Command = require("../../base/Command.js"),
	Discord = require("discord.js"),
	MYSQLPromiseObjectBuilder = require("../../base/MYSQLPromiseObjectBuilder.js");

const mysql = require("mysql");

/**Command for squad profile stats track.
 * <h2>Usage: </h2>
 * <h3>Linking your account</h3>
 * <code>{prefix}profile {Steam64ID}</code>
 * <br />
 * <h3>Removing the link from your account</h3>
 * <code>{prefix}profile re</code> OR <code>{prefix}profile re-link</code>
 * <br />
 * <h6>Note: </h6>
 * <sub><sup>After linking your account you don't need to specify your steam64ID anymore. Just use; <code>{prefix}profile</code></sup></sub>
 *
 * @author LeventHAN
 * @class Squad-Track-Profile
 * @extends Command
 */
class Profile extends Command {
	constructor(client) {
		super(client, {
			name: "profile",
			dirname: __dirname,
			enabled: true,
			guildOnly: true,
			aliases: ["prof", "sq", "squad"],
			memberPermissions: [],
			botPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
			nsfw: false,
			ownerOnly: false,
			cooldown: 1000,
		});
		this.client = client;
		this.pool = null;
	}

	async run(message, args, /**@type {{}}*/ data) {
		if (!data.guild.plugins.squad.enabled)
			return message.error("squad/profile:NOT_ENABLED");

		const client = this.client;
		let steamUID;
		let claimer = "";
		if (this.pool == null) {
			// Only create one instance
			this.pool = mysql.createPool({
				connectionLimit: 10, // Call all
				host: data.guild.plugins.squad.host,
				port: data.guild.plugins.squad.port,
				user: data.guild.plugins.squad.user,
				password: data.guild.plugins.squad.password,
				database: data.guild.plugins.squad.database,
			});
		}
		const pool = this.pool;

		let member = await client.resolveMember(args[0], message.guild);
		if (!member) member = message.member;

		// Check if the user is a bot
		if (member.user.bot) {
			return message.error("squad/profile:BOT_USER");
		}

		// Gets the data of the user whose profile you want to display
		const memberData =
			member.id === message.author.id
				? data.memberData
				: await client.findOrCreateMember({
					id: member.id,
					guildID: message.guild.id,
				  });
		const userData =
			member.id === message.author.id
				? data.userData
				: await client.findOrCreateUser({ id: member.id });

		if (args[0] === "re" || args[0] === "re-link") {
			data.memberData.squad.tracking = false;
			data.memberData.squad.steam64ID = "";
			data.memberData.markModified("squad");
			data.memberData.save();
			return message.success("squad/profile:RE_LINKED");
		}

		const members = await this.client.membersData
			.find({ guildID: message.guild.id })
			.lean();

		members.forEach((element) => {
			if (
				element &&
				element.squad.steam64ID === args[0] &&
				element.id !== message.member.id
			) {
				claimer = element.id;
			}
		});

		if (claimer != "") {
			return message.error("squad/profile:ALREADY_EXISTING", {
				username: claimer,
			});
		}

		if (data.memberData.squad.tracking) {
			steamUID = data.memberData.squad.steam64ID;
		} else {
			steamUID = args[0];
			const steamIDpatter = /^[0-9]{17}$/;
			const uidValid = steamIDpatter.test(steamUID);
			if (!uidValid) {
				return message.error("squad/profile:INVALID_MEMBER");
			}

			data.memberData.squad.steam64ID = steamUID;
			data.memberData.markModified("squad");
			data.memberData.save();
			message.success("squad/profile:SUCCESS", {
				steamID: steamUID,
			});
		}

		/**
		 * Send an embed message to the authors channel with the authors squad stats grabbed from MongoDB.
		 *
		 * @author LeventHAN
		 */
		function sendEmbed() {
			const profileEmbed = new Discord.MessageEmbed()
				.setAuthor(
					message.translate("squad/profile:TITLE", {
						username: member.user.tag,
					}),
					member.user.displayAvatarURL()
				)
				.setDescription(
					userData.bio
						? userData.bio
						: message.translate("squad/profile:NO_BIO")
				)
				.addField(
					message.translate("squad/profile:STEAMS"),
					message.translate("squad/profile:STEAM", {
						steamName: memberData.squad.steamName,
						steam64ID: memberData.squad.steam64ID || "#",
					}),
					false
				)
				.addField("\u200B", "\u200B")
				.addField(
					message.translate("squad/profile:KDS"),
					message.translate("squad/profile:KD", {
						kd: memberData.squad.kd,
					}),
					true
				)
				.addField(
					message.translate("squad/profile:KILLS"),
					message.translate("squad/profile:KILL", {
						kills: memberData.squad.kills,
					}),
					true
				)
				.addField(
					message.translate("squad/profile:DEATHS"),
					message.translate("squad/profile:DEATH", {
						deaths: memberData.squad.deaths,
					}),
					true
				)
				.addField(
					message.translate("squad/profile:WOUNDS_INF"),
					message.translate("squad/profile:WOUNDS", {
						kills: memberData.squad.woundsINF,
					}),
					true
				)
				.addField(
					message.translate("squad/profile:WOUNDS_VEH"),
					message.translate("squad/profile:WOUNDS", {
						kills: memberData.squad.woundsVEH,
					}),
					true
				)
				.addField(
					message.translate("squad/profile:REVIVES"),
					message.translate("squad/profile:REVIVE", {
						revives: memberData.squad.revives,
					}),
					true
				)
				.addField(
					message.translate("squad/profile:TEAMKILLS"),
					message.translate("squad/profile:TEAMKILL", {
						tk: memberData.squad.tk,
					}),
					true
				)
				.addField(
					message.translate("squad/profile:MK_GUNS"),
					message.translate("squad/profile:MK_GUN", {
						gun: memberData.squad.mk_gun,
					}),
					true
				)
				.addField(
					message.translate("squad/profile:MK_ROLES"),
					message.translate("squad/profile:MK_ROLE", {
						role: memberData.squad.mk_role,
					}),
					true
				)
				.addField("\u200B", "\u200B")
				.addField(
					message.translate("squad/profile:EXPS"),
					message.translate("squad/profile:EXP", {
						exp: memberData.squad.exp,
					}),
					true
				)
				.addField(message.translate("squad/profile:HOURS"), "Soon™", true)
				.addField(message.translate("squad/profile:ACTIVITY"), "Soon™", true)
				.setColor(data.config.embed.color) // Sets the color of the embed
				.setFooter(data.config.embed.footer) // Sets the footer of the embed
				.setTimestamp();
			message.channel.send(profileEmbed);
		}

		/**
		 * Saves the current trackdate and tracking status in the mongodb which will be used later to determine if it should refetch new data from MySQL DB or grab it from mongoDB.
		 *
		 * @param {number} dt - The dateTime of now in epoch.
		 */
		function saveTracking(dt) {
			data.memberData.squad.trackDate = dt;

			if (!data.memberData.squad.tracking) {
				data.memberData.squad.tracking = true;
			}
			data.memberData.markModified("squad");
			data.memberData.save();
		}

		/**
		 * Gives a K/D role to the message author if the guild/discord server has those roles installed.
		 */
		function giveDiscordRoles() {
			const regexKD = /^KD /i;
			message.member.roles.cache.some((role) => {
				if (regexKD.test(role.name))
					message.member.roles.remove(role).catch(console.error);
			});
			let roleName = "KD 0+";
			switch (true) {
			case parseFloat(data.memberData.squad.kd) < 0.5:
				roleName = "KD 0+";
				break;
			case parseFloat(data.memberData.squad.kd) < 1.0:
				roleName = "KD 0.5+";
				break;
			case parseFloat(data.memberData.squad.kd) < 1.5:
				roleName = "KD 1+";
				break;
			case parseFloat(data.memberData.squad.kd) < 2.0:
				roleName = "KD 1.5+";
				break;
			case parseFloat(data.memberData.squad.kd) < 2.5:
				roleName = "KD 2+";
				break;
			case parseFloat(data.memberData.squad.kd) < 3.0:
				roleName = "KD 2.5+";
				break;
			case parseFloat(data.memberData.squad.kd) < 3.5:
				roleName = "KD 3+";
				break;
			case parseFloat(data.memberData.squad.kd) < 4.0:
				roleName = "KD 3.5+";
				break;
			case parseFloat(data.memberData.squad.kd) < 4.5:
				roleName = "KD 4+";
				break;
			case parseFloat(data.memberData.squad.kd) < 5.0:
				roleName = "KD 4.5+";
				break;
			case parseFloat(data.memberData.squad.kd) < 5.5:
				roleName = "KD 5+";
				break;
			case parseFloat(data.memberData.squad.kd) < 6.0:
				roleName = "KD 5.5+";
				break;
			case parseFloat(data.memberData.squad.kd) < 6.5:
				roleName = "KD 6+";
				break;
			case parseFloat(data.memberData.squad.kd) < 7:
				roleName = "KD 6.5+";
				break;
			case parseFloat(data.memberData.squad.kd) < 7.5:
				roleName = "KD 7+";
				break;
			case parseFloat(data.memberData.squad.kd) < 8:
				roleName = "KD 7.5+";
				break;
			case parseFloat(data.memberData.squad.kd) < 8.5:
				roleName = "KD 8+";
				break;
			case parseFloat(data.memberData.squad.kd) < 9:
				roleName = "KD 8.5+";
				break;
			case parseFloat(data.memberData.squad.kd) < 9.5:
				roleName = "KD 9+";
				break;
			case parseFloat(data.memberData.squad.kd) < 10:
				roleName = "KD 9.5+";
				break;
			case parseFloat(data.memberData.squad.kd) > 10:
				roleName = "KD 10+";
				break;
			default:
				roleName = "KD 0+";
				break;
			}
			const role = message.guild.roles.cache.find((r) => r.name === roleName);
			message.member.roles.add(role).catch(console.error);
			message.success("squad/profile:UPDATE", {
				creator: message.author.toString(),
				steamID: steamUID,
			});
		}

		let dt = new Date();
		dt = dt.setHours(dt.getHours() + 2);
		dt = new Date(dt);

		let lastUpdate = new Date(data.memberData.squad.trackDate);
		lastUpdate = lastUpdate.setHours(lastUpdate.getHours() + 1);
		lastUpdate = new Date(lastUpdate);
		if (
			!data.memberData.squad.tracking ||
			(data.memberData.squad.tracking && lastUpdate < dt)
		) {
			let res = new MYSQLPromiseObjectBuilder(pool);
			res.add(
				"steamName",
				`SELECT lastName FROM DBLog_SteamUsers WHERE steamID = "${steamUID}"`,
				"Undefined",
				"lastName"
			);
			res.add(
				"kd",
				`SELECT (COUNT(*)/(SELECT COUNT(*) FROM DBLog_Deaths WHERE victim = "${steamUID}")) AS KD FROM DBLog_Deaths WHERE attacker="${steamUID}"`,
				"0",
				"KD"
			);
			res.add(
				"kills",
				`SELECT COUNT(*) AS Kills FROM DBLog_Deaths WHERE attacker = "${steamUID}"`,
				"0",
				"Kills"
			);
			res.add(
				"deaths",
				`SELECT COUNT(*) AS Deaths FROM DBLog_Deaths WHERE victim = "${steamUID}"`,
				"0",
				"Deaths"
			);
			res.add(
				"woundsINF",
				`SELECT COUNT(*) AS Kills_INF FROM DBLog_Wounds WHERE attacker = "${steamUID}" AND weapon NOT REGEXP '(kord|stryker|uh60|projectile|mortar|btr80|btr82|deployable|kornet|s5|s8|tow|crows|50cal|warrior|coax|L30A1|_hesh|_AP|technical|shield|DShK|brdm|2A20|LAV|M1126|T72|bmp2|SPG9|FV4034|Truck|logi|FV432|2A46|Tigr)'`,
				"0",
				"Kills_INF"
			);
			res.add(
				"woundsVEH",
				`SELECT COUNT(*) AS Kills_VEH FROM DBLog_Wounds WHERE attacker = "${steamUID}" AND weapon REGEXP '(kord|stryker|uh60|projectile|mortar|btr80|btr82|deployable|kornet|s5|s8|tow|crows|50cal|warrior|coax|L30A1|_hesh|_AP|technical|shield|DShK|brdm|2A20|LAV|M1126|T72|bmp2|SPG9|FV4034|Truck|logi|FV432|2A46|Tigr)'`,
				"0",
				"Kills_VEH"
			);
			res.add(
				"revives",
				`SELECT COUNT(*) AS Revives FROM DBLog_Revives WHERE reviver = "${steamUID}"`,
				"0",
				"Revives"
			);
			res.add(
				"tk",
				`SELECT COUNT(*) AS TeamKills FROM DBLog_Wounds WHERE attacker = "${steamUID}" AND teamkill=1`,
				"0",
				"TeamKills"
			);
			res.add(
				"mk_gun",
				`SELECT weapon AS Fav_Gun FROM DBLog_Wounds WHERE attacker = "${steamUID}" GROUP BY weapon ORDER BY COUNT(weapon) DESC LIMIT 1`,
				"0",
				"Fav_Gun"
			);
			res.add(
				"mk_role",
				`SELECT weapon AS Fav_Role FROM DBLog_Deaths WHERE attacker = "${steamUID}" GROUP BY weapon ORDER BY COUNT(weapon) DESC LIMIT 1`,
				"0",
				"Fav_Role"
			);

			await res.waitForAll(data.memberData.squad);
			await data.memberData.markModified("squad");
			await data.memberData.save();
			await saveTracking(dt);
			if (data.guild.plugins.squad.rolesEnabled) {
				await giveDiscordRoles();
			}
			await sendEmbed();
		} else {
			await sendEmbed();
		}
	}
}

module.exports = Profile;
